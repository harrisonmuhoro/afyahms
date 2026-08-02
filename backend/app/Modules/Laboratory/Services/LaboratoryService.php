<?php

declare(strict_types=1);

namespace App\Modules\Laboratory\Services;

use App\Exceptions\Domain\ConflictException;
use App\Exceptions\Domain\NotFoundException;
use App\Models\User;
use App\Modules\Laboratory\Models\LabOrder;
use App\Modules\Laboratory\Models\LabResult;
use App\Modules\Laboratory\Models\LabTest;
use App\Modules\Queue\Models\Visit;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Laboratory domain service.
 *
 * Responsibilities:
 *  - Catalog: list/search available tests.
 *  - Orders: place orders from an encounter, update status through workflow.
 *  - Results: record & verify results, flag critical values.
 */
final class LaboratoryService
{
    // ──────────────────────────────────────────────────────────────────────────
    //  Test Catalog
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Search the lab test catalog.
     *
     * @return \Illuminate\Contracts\Pagination\LengthAwarePaginator<LabTest>
     */
    public function searchCatalog(string $query = '', string $category = ''): LengthAwarePaginator
    {
        return LabTest::query()
            ->where('is_active', true)
            ->when($query !== '', fn ($q) => $q->where(function ($q) use ($query): void {
                $q->where('name', 'like', "%{$query}%")
                  ->orWhere('code', 'like', "%{$query}%");
            }))
            ->when($category !== '', fn ($q) => $q->where('category', $category))
            ->orderBy('name')
            ->paginate(50);
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Orders
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Return all orders for a visit.
     *
     * @return Collection<int, LabOrder>
     */
    public function ordersForVisit(Visit $visit): Collection
    {
        return LabOrder::query()
            ->where('visit_id', $visit->id)
            ->with(['test', 'result', 'orderedBy'])
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * Branch-wide worklist of recent lab orders (today's dashboard view).
     * Optionally filtered by status; cancelled orders are excluded by default.
     *
     * @return Collection<int, LabOrder>
     */
    public function worklist(string $status = '', int $limit = 100): Collection
    {
        return LabOrder::query()
            ->when(
                $status !== '',
                fn ($q) => $q->where('status', $status),
                fn ($q) => $q->where('status', '!=', 'cancelled'),
            )
            ->with(['test', 'result', 'orderedBy'])
            ->orderByRaw("CASE priority WHEN 'stat' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END")
            ->orderBy('created_at')
            ->limit($limit)
            ->get();
    }

    /**
     * Place a new lab test order for a visit.
     *
     * @param array<string, mixed> $data
     */
    public function placeOrder(Visit $visit, LabTest $test, User $orderedBy, array $data = []): LabOrder
    {
        $existing = LabOrder::query()
            ->where('visit_id', $visit->id)
            ->where('lab_test_id', $test->id)
            ->whereNotIn('status', ['cancelled'])
            ->first();

        if ($existing !== null) {
            throw new ConflictException(
                "Test '{$test->name}' is already ordered for this visit.",
                409,
                ['code' => 'LAB_ORDER_DUPLICATE'],
            );
        }

        return LabOrder::create([
            'branch_id'      => $visit->branch_id,
            'visit_id'       => $visit->id,
            'patient_id'     => $visit->patient_id,
            'ordered_by'     => $orderedBy->id,
            'lab_test_id'    => $test->id,
            'status'         => 'pending',
            'priority'       => $data['priority']       ?? 'routine',
            'clinical_notes' => $data['clinical_notes'] ?? null,
            'specimen_type'  => $data['specimen_type']  ?? null,
        ]);
    }

    /**
     * Mark a pending order as specimen collected → "collected".
     */
    public function markCollected(LabOrder $order): LabOrder
    {
        $this->assertStatus($order, ['pending'], 'collect');

        $order->update([
            'status'       => 'collected',
            'collected_at' => now(),
        ]);

        return $order->refresh();
    }

    /**
     * Mark a collected order as "processing" (analysis started).
     */
    public function markProcessing(LabOrder $order): LabOrder
    {
        $this->assertStatus($order, ['collected'], 'start processing');

        $order->update(['status' => 'processing']);

        return $order->refresh();
    }

    /**
     * Cancel a pending or collected order.
     */
    public function cancel(LabOrder $order, string $reason = ''): LabOrder
    {
        $this->assertStatus($order, ['pending', 'collected'], 'cancel');

        $order->update([
            'status'         => 'cancelled',
            'clinical_notes' => $reason ?: $order->clinical_notes,
        ]);

        return $order->refresh();
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Results
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Record the result for an order (moves order → "resulted").
     *
     * @param array<string, mixed> $resultData
     */
    public function recordResult(LabOrder $order, User $technicianUser, array $resultData): LabResult
    {
        if ($order->status === 'resulted') {
            throw new ConflictException(
                'Result already recorded for this order.',
                409,
                ['code' => 'LAB_RESULT_EXISTS'],
            );
        }

        $this->assertStatus($order, ['collected', 'processing'], 'record result');

        return DB::transaction(function () use ($order, $technicianUser, $resultData): LabResult {
            $isCritical = (bool) ($resultData['is_critical'] ?? false);

            $result = LabResult::create([
                'lab_order_id'    => $order->id,
                'reported_by'     => $technicianUser->id,
                'findings'        => (string) ($resultData['findings']         ?? ''),
                'interpretation'  => (string) ($resultData['interpretation']   ?? 'normal'),
                'reference_range' => $resultData['reference_range'] ?? null,
                'unit'            => $resultData['unit']            ?? null,
                'value'           => $resultData['value']           ?? null,
                'is_critical'     => $isCritical,
                'notes'           => $resultData['notes']           ?? null,
            ]);

            $order->update([
                'status'      => 'resulted',
                'resulted_at' => now(),
            ]);

            return $result;
        });
    }

    /**
     * Verify a result (e.g., senior pathologist sign-off).
     */
    public function verifyResult(LabResult $result, User $verifier): LabResult
    {
        if ($result->verified_at !== null) {
            throw new ConflictException(
                'Result is already verified.',
                409,
                ['code' => 'LAB_RESULT_ALREADY_VERIFIED'],
            );
        }

        $result->update([
            'verified_at' => now(),
            'verified_by' => $verifier->id,
        ]);

        return $result->refresh();
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Helpers
    // ──────────────────────────────────────────────────────────────────────────

    /** @param array<int, string> $allowed */
    private function assertStatus(LabOrder $order, array $allowed, string $action): void
    {
        if (! in_array($order->status, $allowed, true)) {
            throw new ConflictException(
                "Cannot {$action} an order in status '{$order->status}'.",
                409,
                ['code' => 'LAB_ORDER_INVALID_TRANSITION'],
            );
        }
    }
}
