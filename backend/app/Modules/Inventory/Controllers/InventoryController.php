<?php

declare(strict_types=1);

namespace App\Modules\Inventory\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Inventory\Models\InventoryItem;
use App\Modules\Inventory\Models\PurchaseOrder;
use App\Modules\Inventory\Models\Supplier;
use App\Modules\Inventory\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Modules\Tenancy\Services\BranchContext;

/**
 * Inventory API controller.
 */
final class InventoryController extends Controller
{
    public function __construct(private readonly InventoryService $inventory) {}

    // ─── KPIs ───────────────────────────────────────────────────────────────

    public function kpiSummary(): JsonResponse
    {
        return response()->json(['data' => $this->inventory->kpiSummary()]);
    }

    // ─── Items ──────────────────────────────────────────────────────────────

    public function getItems(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search'    => ['nullable', 'string', 'max:100'],
            'category'  => ['nullable', 'string', 'max:60'],
            'low_stock' => ['nullable', 'boolean'],
        ]);

        $items = $this->inventory->listItems(
            search:       (string) ($validated['search'] ?? ''),
            category:     (string) ($validated['category'] ?? ''),
            lowStockOnly: (bool)   ($validated['low_stock'] ?? false),
        );
        return response()->json($items);
    }

    public function createItem(Request $request, BranchContext $branchContext): JsonResponse
    {
        $validated = $request->validate([
            'sku'              => ['required', 'string', 'unique:inventory_items,sku'],
            'name'             => ['required', 'string', 'max:255'],
            'category'         => ['nullable', 'string', 'max:100'],
            'unit'             => ['required', 'string', 'max:50'],
            'reorder_level'    => ['required', 'integer', 'min:0'],
            'unit_cost'        => ['nullable', 'numeric', 'min:0'],
        ]);

        $item = $this->inventory->createItem($branchContext->get(), $validated);

        return response()->json(['data' => $item], 201);
    }

    public function updateItem(Request $request, InventoryItem $item): JsonResponse
    {
        $validated = $request->validate([
            'name'             => ['nullable', 'string', 'max:255'],
            'category'         => ['nullable', 'string', 'max:100'],
            'unit'             => ['nullable', 'string', 'max:50'],
            'reorder_level'    => ['nullable', 'integer', 'min:0'],
            'unit_cost'        => ['nullable', 'numeric', 'min:0'],
        ]);

        $item = $this->inventory->updateItem($item, $validated);

        return response()->json(['data' => $item]);
    }

    // ─── Batches & Adjustments ──────────────────────────────────────────────

    public function getExpiringBatches(Request $request): JsonResponse
    {
        $days = (int) $request->query('days', 30);
        $batches = $this->inventory->expiringBatches($days);

        return response()->json(['data' => $batches]);
    }

    public function receiveBatch(Request $request, InventoryItem $item): JsonResponse
    {
        $validated = $request->validate([
            'quantity_received' => ['required', 'integer', 'min:1'],
            'batch_number'      => ['nullable', 'string', 'max:80'],
            'supplier_id'       => ['nullable', 'integer', 'exists:suppliers,id'],
            'unit_cost'         => ['nullable', 'numeric', 'min:0'],
            'manufacture_date'  => ['nullable', 'date'],
            'expiry_date'       => ['nullable', 'date'],
            'notes'             => ['nullable', 'string', 'max:500'],
        ]);

        $batch = $this->inventory->receiveBatch($item, $request->user(), $validated);

        return response()->json(['data' => $batch], 201);
    }

    public function adjustStock(Request $request, InventoryItem $item): JsonResponse
    {
        $validated = $request->validate([
            'quantity_change'    => ['required', 'integer', 'not_in:0'],
            'inventory_batch_id' => ['nullable', 'integer', 'exists:inventory_batches,id'],
            'reason'             => ['required', 'string', 'in:received,dispensed,expired,damaged,transferred,correction'],
            'notes'              => ['nullable', 'string', 'max:500'],
        ]);

        $adj = $this->inventory->adjust($item, $request->user(), $validated);

        return response()->json(['data' => $adj]);
    }

    // ─── Suppliers ──────────────────────────────────────────────────────────

    public function getSuppliers(Request $request): JsonResponse
    {
        $search = (string) $request->query('search', '');
        $suppliers = $this->inventory->listSuppliers($search);
        return response()->json($suppliers);
    }

    public function createSupplier(Request $request, BranchContext $branchContext): JsonResponse
    {
        $validated = $request->validate([
            'name'           => ['required', 'string', 'max:255'],
            'code'           => ['nullable', 'string', 'max:30', 'unique:suppliers,code'],
            'category'       => ['nullable', 'string', 'max:60'],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'email'          => ['nullable', 'email', 'max:255'],
            'phone'          => ['nullable', 'string', 'max:30'],
            'address'        => ['nullable', 'string', 'max:500'],
        ]);

        $supplier = $this->inventory->createSupplier($branchContext->get(), $validated);

        return response()->json(['data' => $supplier], 201);
    }

    // ─── Purchase Orders ────────────────────────────────────────────────────

    public function getPurchaseOrders(Request $request): JsonResponse
    {
        $status = (string) $request->query('status', '');
        $pos = $this->inventory->listPurchaseOrders($status);
        return response()->json($pos);
    }

    public function createPurchaseOrder(Request $request, BranchContext $branchContext): JsonResponse
    {
        $validated = $request->validate([
            'supplier_id'            => ['required', 'integer', 'exists:suppliers,id'],
            'expected_delivery_date' => ['nullable', 'date'],
            'notes'                  => ['nullable', 'string', 'max:1000'],
            'items'                  => ['required', 'array', 'min:1'],
            'items.*.inventory_item_id' => ['required', 'integer', 'exists:inventory_items,id'],
            'items.*.quantity_ordered'  => ['required', 'integer', 'min:1'],
            'items.*.unit_cost'         => ['required', 'numeric', 'min:0'],
            'items.*.notes'             => ['nullable', 'string', 'max:255'],
        ]);

        $supplier = Supplier::findOrFail((int) $validated['supplier_id']);
        
        $po = $this->inventory->createPurchaseOrder(
            $branchContext->get(),
            $supplier,
            $request->user(),
            $validated,
            $validated['items'],
        );

        return response()->json(['data' => $po], 201);
    }

    public function submitPurchaseOrder(PurchaseOrder $po): JsonResponse
    {
        $po = $this->inventory->submitPurchaseOrder($po);
        return response()->json(['data' => $po]);
    }

    public function receivePurchaseOrder(Request $request, PurchaseOrder $po): JsonResponse
    {
        $validated = $request->validate([
            'items'                     => ['required', 'array'],
            'items.*.po_item_id'        => ['required', 'integer', 'exists:purchase_order_items,id'],
            'items.*.quantity_received' => ['required', 'integer', 'min:0'],
            'items.*.batch_number'      => ['nullable', 'string', 'max:80'],
            'items.*.expiry_date'       => ['nullable', 'date'],
        ]);

        $po = $this->inventory->receivePurchaseOrder($po, $request->user(), $validated['items']);

        // Dispatch background job to notify staff (prevents HTTP thread blocking)
        \App\Jobs\NotifyStockReceived::dispatch($po);

        return response()->json(['data' => $po]);
    }

    public function cancelPurchaseOrder(Request $request, PurchaseOrder $po): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $po = $this->inventory->cancelPurchaseOrder($po, (string) ($validated['reason'] ?? ''));

        return response()->json(['data' => $po]);
    }
}
