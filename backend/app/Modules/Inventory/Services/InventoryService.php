<?php

declare(strict_types=1);

namespace App\Modules\Inventory\Services;

use App\Exceptions\Domain\ConflictException;
use App\Exceptions\Domain\ValidationFailedException;
use App\Models\User;
use App\Modules\Inventory\Models\InventoryBatch;
use App\Modules\Inventory\Models\InventoryItem;
use App\Modules\Inventory\Models\PurchaseOrder;
use App\Modules\Inventory\Models\PurchaseOrderItem;
use App\Modules\Inventory\Models\StockAdjustment;
use App\Modules\Inventory\Models\Supplier;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Inventory domain service.
 *
 * Responsibilities:
 *  - Items: list, create, update with branch scoping.
 *  - Batches: receive stock, track expiry, flag low-stock.
 *  - Stock Adjustments: apply write-offs, corrections, receipts.
 *  - Suppliers: CRUD.
 *  - Purchase Orders: raise, submit, receive (auto-updates stock).
 */
final class InventoryService
{
    // ──────────────────────────────────────────────────────────────────────────
    //  Items
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * @return LengthAwarePaginator<InventoryItem>
     */
    public function listItems(
        string $search = '',
        string $category = '',
        bool $lowStockOnly = false,
    ): LengthAwarePaginator {
        return InventoryItem::query()
            ->when($search !== '', fn ($q) => $q->where(function ($q) use ($search): void {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%");
            }))
            ->when($category !== '', fn ($q) => $q->where('category', $category))
            ->when($lowStockOnly, fn ($q) => $q->whereColumn('quantity_on_hand', '<=', 'reorder_level'))
            ->orderBy('name')
            ->paginate(25);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function createItem(int $branchId, array $data): InventoryItem
    {
        return InventoryItem::create(array_merge($data, ['branch_id' => $branchId]));
    }

    /**
     * @param array<string, mixed> $data
     */
    public function updateItem(InventoryItem $item, array $data): InventoryItem
    {
        $item->update($data);

        return $item->refresh();
    }

    /**
     * KPI summary for the dashboard: total value, low-stock count, expiry count, active POs.
     *
     * @return array<string, mixed>
     */
    public function kpiSummary(): array
    {
        $totalValue = InventoryItem::query()
            ->selectRaw('SUM(quantity_on_hand * unit_cost) as total')
            ->value('total') ?? 0;

        $lowStock = InventoryItem::query()
            ->whereColumn('quantity_on_hand', '<=', 'reorder_level')
            ->count();

        $expiringSoon = InventoryBatch::query()
            ->where('status', 'active')
            ->where('quantity_remaining', '>', 0)
            ->whereNotNull('expiry_date')
            ->whereDate('expiry_date', '<=', now()->addDays(30))
            ->count();

        $activePOs = PurchaseOrder::query()
            ->whereNotIn('status', ['received', 'cancelled'])
            ->count();

        return [
            'total_inventory_value' => round((float) $totalValue, 2),
            'low_stock_count'       => $lowStock,
            'expiring_soon_count'   => $expiringSoon,
            'active_po_count'       => $activePOs,
        ];
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Batches
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Receive a new batch into stock (also triggers a positive StockAdjustment).
     *
     * @param array<string, mixed> $data
     */
    public function receiveBatch(InventoryItem $item, User $actor, array $data): InventoryBatch
    {
        return DB::transaction(function () use ($item, $actor, $data): InventoryBatch {
            /** @var InventoryItem $lockedItem */
            $lockedItem = InventoryItem::query()->whereKey($item->id)->lockForUpdate()->firstOrFail();
            $qty = (int) ($data['quantity_received'] ?? 0);
            if ($qty < 1) {
                throw new ValidationFailedException('Received quantity must be greater than zero.');
            }

            $batch = InventoryBatch::create([
                'branch_id'          => $lockedItem->branch_id,
                'inventory_item_id'  => $lockedItem->id,
                'batch_number'       => (string) ($data['batch_number'] ?? Str::upper(Str::random(8))),
                'supplier_id'        => $data['supplier_id']        ?? null,
                'quantity_received'  => $qty,
                'quantity_remaining' => $qty,
                'unit_cost'          => (float) ($data['unit_cost']  ?? $lockedItem->unit_cost ?? 0),
                'manufacture_date'   => $data['manufacture_date']    ?? null,
                'expiry_date'        => $data['expiry_date']         ?? null,
                'status'             => 'active',
            ]);

            $before = (int) $lockedItem->quantity_on_hand;
            $lockedItem->quantity_on_hand = $before + $qty;
            $lockedItem->save();

            StockAdjustment::create([
                'branch_id'           => $lockedItem->branch_id,
                'inventory_item_id'   => $lockedItem->id,
                'inventory_batch_id'  => $batch->id,
                'performed_by'        => $actor->id,
                'quantity_before'     => $before,
                'quantity_change'     => $qty,
                'quantity_after'      => $before + $qty,
                'reason'              => 'received',
                'notes'               => $data['notes'] ?? null,
            ]);

            return $batch;
        });
    }

    /**
     * Batches expiring within $days from today.
     *
     * @return Collection<int, InventoryBatch>
     */
    public function expiringBatches(int $days = 30): Collection
    {
        return InventoryBatch::query()
            ->with('item')
            ->where('status', 'active')
            ->where('quantity_remaining', '>', 0)
            ->whereNotNull('expiry_date')
            ->whereDate('expiry_date', '<=', now()->addDays($days))
            ->orderBy('expiry_date')
            ->get();
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Stock Adjustments
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Apply a manual stock adjustment (write-off, damage, transfer, correction).
     *
     * @param array<string, mixed> $data
     */
    public function adjust(InventoryItem $item, User $actor, array $data): StockAdjustment
    {
        return DB::transaction(function () use ($item, $actor, $data): StockAdjustment {
            /** @var InventoryItem $lockedItem */
            $lockedItem = InventoryItem::query()->whereKey($item->id)->lockForUpdate()->firstOrFail();
            $change = (int) ($data['quantity_change'] ?? 0);
            $before = (int) $lockedItem->quantity_on_hand;
            $after = $before + $change;
            if ($after < 0) {
                throw new ConflictException('Stock adjustment would make on-hand quantity negative.', 409);
            }

            $batchId = isset($data['inventory_batch_id']) ? (int) $data['inventory_batch_id'] : null;
            if ($batchId !== null) {
                $batch = InventoryBatch::query()->whereKey($batchId)->lockForUpdate()->firstOrFail();
                if ((int) $batch->inventory_item_id !== (int) $lockedItem->id || (int) $batch->branch_id !== (int) $lockedItem->branch_id) {
                    throw new ConflictException('Inventory batch does not belong to this item and branch.', 409);
                }
                if ($change < 0 && (int) $batch->quantity_remaining < abs($change)) {
                    throw new ConflictException('Adjustment exceeds the selected batch quantity.', 409);
                }
                $batch->quantity_remaining = (int) $batch->quantity_remaining + $change;
                if ($change > 0) {
                    $batch->quantity_received = (int) $batch->quantity_received + $change;
                }
                $batch->status = $batch->quantity_remaining === 0 ? 'exhausted' : 'active';
                $batch->save();
            } elseif ($change < 0) {
                $remainingToRemove = abs($change);
                $batches = InventoryBatch::query()
                    ->where('inventory_item_id', $lockedItem->id)
                    ->where('branch_id', $lockedItem->branch_id)
                    ->where('quantity_remaining', '>', 0)
                    ->orderBy('expiry_date')
                    ->orderBy('id')
                    ->lockForUpdate()
                    ->get();
                foreach ($batches as $batch) {
                    if ($remainingToRemove === 0) {
                        break;
                    }
                    $taken = min($remainingToRemove, (int) $batch->quantity_remaining);
                    $batch->quantity_remaining -= $taken;
                    $batch->status = $batch->quantity_remaining === 0 ? 'exhausted' : 'active';
                    $batch->save();
                    $remainingToRemove -= $taken;
                }
            }

            $lockedItem->quantity_on_hand = $after;
            $lockedItem->save();

            return StockAdjustment::create([
                'branch_id'          => $lockedItem->branch_id,
                'inventory_item_id'  => $lockedItem->id,
                'inventory_batch_id' => $batchId,
                'performed_by'       => $actor->id,
                'quantity_before'    => $before,
                'quantity_change'    => $change,
                'quantity_after'     => $after,
                'reason'             => (string) ($data['reason'] ?? 'correction'),
                'notes'              => $data['notes'] ?? null,
            ]);
        });
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Suppliers
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * @return LengthAwarePaginator<Supplier>
     */
    public function listSuppliers(string $search = ''): LengthAwarePaginator
    {
        return Supplier::query()
            ->when($search !== '', fn ($q) => $q->where(function ($q) use ($search): void {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
            }))
            ->where('is_active', true)
            ->orderBy('name')
            ->paginate(25);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function createSupplier(int $branchId, array $data): Supplier
    {
        return Supplier::create(array_merge($data, ['branch_id' => $branchId]));
    }

    /**
     * @param array<string, mixed> $data
     */
    public function updateSupplier(Supplier $supplier, array $data): Supplier
    {
        $supplier->update($data);

        return $supplier->refresh();
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Purchase Orders
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * @return LengthAwarePaginator<PurchaseOrder>
     */
    public function listPurchaseOrders(string $status = ''): LengthAwarePaginator
    {
        return PurchaseOrder::query()
            ->with(['supplier', 'raisedBy'])
            ->when($status !== '', fn ($q) => $q->where('status', $status))
            ->orderByDesc('created_at')
            ->paginate(20);
    }

    /**
     * Create a new draft PO.
     *
     * @param array<string, mixed>               $data
     * @param array<int, array<string, mixed>>   $lineItems
     */
    public function createPurchaseOrder(
        int $branchId,
        Supplier $supplier,
        User $actor,
        array $data,
        array $lineItems,
    ): PurchaseOrder {
        return DB::transaction(function () use ($branchId, $supplier, $actor, $data, $lineItems): PurchaseOrder {
            $po = PurchaseOrder::create([
                'branch_id'              => $branchId,
                'supplier_id'            => $supplier->id,
                'raised_by'              => $actor->id,
                'po_number'              => $this->generatePoNumber($branchId),
                'status'                 => 'draft',
                'expected_delivery_date' => $data['expected_delivery_date'] ?? null,
                'notes'                  => $data['notes']                  ?? null,
                'total_amount'           => 0,
            ]);

            $total = 0.0;
            foreach ($lineItems as $line) {
                $qty       = (int)   ($line['quantity_ordered'] ?? 0);
                $unitCost  = (float) ($line['unit_cost']        ?? 0);
                $lineCost  = $qty * $unitCost;
                $total    += $lineCost;

                PurchaseOrderItem::create([
                    'purchase_order_id'  => $po->id,
                    'inventory_item_id'  => (int) $line['inventory_item_id'],
                    'quantity_ordered'   => $qty,
                    'quantity_received'  => 0,
                    'unit_cost'          => $unitCost,
                    'total_cost'         => $lineCost,
                    'notes'              => $line['notes'] ?? null,
                ]);
            }

            $po->update(['total_amount' => round($total, 2)]);

            return $po->load(['items.item', 'supplier', 'raisedBy']);
        });
    }

    /**
     * Submit a draft PO (mark sent to supplier).
     */
    public function submitPurchaseOrder(PurchaseOrder $po): PurchaseOrder
    {
        $this->assertPoStatus($po, ['draft'], 'submit');

        $po->update(['status' => 'sent', 'sent_at' => now()]);

        return $po->refresh();
    }

    /**
     * Mark a PO as fully received and auto-receive stock batches.
     *
     * @param array<int, array<string, mixed>> $receivedLines  [{po_item_id, quantity_received, batch_number?, expiry_date?}]
     */
    public function receivePurchaseOrder(PurchaseOrder $po, User $actor, array $receivedLines): PurchaseOrder
    {
        return DB::transaction(function () use ($po, $actor, $receivedLines): PurchaseOrder {
            /** @var PurchaseOrder $lockedPo */
            $lockedPo = PurchaseOrder::query()->whereKey($po->id)->lockForUpdate()->firstOrFail();
            $this->assertPoStatus($lockedPo, ['sent', 'acknowledged', 'shipped', 'partially_received'], 'receive');

            foreach ($receivedLines as $line) {
                $poItem = PurchaseOrderItem::query()
                    ->where('purchase_order_id', $lockedPo->id)
                    ->whereKey((int) $line['po_item_id'])
                    ->lockForUpdate()
                    ->firstOrFail();
                $newReceived = (int) ($line['quantity_received'] ?? 0);
                $previouslyReceived = (int) $poItem->quantity_received;
                if ($newReceived < $previouslyReceived || $newReceived > (int) $poItem->quantity_ordered) {
                    throw new ConflictException('Received quantity must be between the prior received total and the ordered quantity.', 409);
                }

                $delta = $newReceived - $previouslyReceived;
                $poItem->update(['quantity_received' => $newReceived]);
                if ($delta === 0) {
                    continue;
                }

                $inventoryItem = InventoryItem::query()->whereKey($poItem->inventory_item_id)->lockForUpdate()->firstOrFail();

                $this->receiveBatch($inventoryItem, $actor, [
                    'quantity_received' => $delta,
                    'batch_number'      => $line['batch_number'] ?? null,
                    'supplier_id'       => $lockedPo->supplier_id,
                    'unit_cost'         => $poItem->unit_cost,
                    'expiry_date'       => $line['expiry_date'] ?? null,
                    'notes'             => "PO: {$lockedPo->po_number}",
                ]);
            }

            $allReceived = ! $lockedPo->items()
                ->whereColumn('quantity_received', '<', 'quantity_ordered')
                ->exists();
            $lockedPo->update([
                'status' => $allReceived ? 'received' : 'partially_received',
                'delivered_date' => $allReceived ? now()->toDateString() : null,
            ]);

            return $lockedPo->refresh()->load(['items.item', 'supplier', 'raisedBy']);
        });
    }

    /**
     * Cancel a draft or sent PO.
     */
    public function cancelPurchaseOrder(PurchaseOrder $po, string $reason = ''): PurchaseOrder
    {
        $this->assertPoStatus($po, ['draft', 'sent', 'acknowledged'], 'cancel');

        $po->update([
            'status' => 'cancelled',
            'notes'  => $reason ?: $po->notes,
        ]);

        return $po->refresh();
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Helpers
    // ──────────────────────────────────────────────────────────────────────────

    private function generatePoNumber(int $branchId): string
    {
        $year  = now()->format('Y');
        $count = PurchaseOrder::query()
            ->where('branch_id', $branchId)
            ->whereYear('created_at', $year)
            ->count() + 1;

        return "PO-{$year}-" . str_pad((string) $count, 4, '0', STR_PAD_LEFT);
    }

    /** @param array<int, string> $allowed */
    private function assertPoStatus(PurchaseOrder $po, array $allowed, string $action): void
    {
        if (! in_array($po->status, $allowed, true)) {
            throw new ConflictException(
                "Cannot {$action} a PO in status '{$po->status}'.",
                409,
                ['code' => 'PO_INVALID_TRANSITION'],
            );
        }
    }
}
