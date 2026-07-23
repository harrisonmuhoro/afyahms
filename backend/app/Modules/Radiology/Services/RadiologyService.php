<?php

declare(strict_types=1);

namespace App\Modules\Radiology\Services;

use App\Exceptions\Domain\ConflictException;
use App\Models\User;
use App\Modules\Queue\Models\Visit;
use App\Modules\Radiology\Models\ImagingOrder;
use App\Modules\Radiology\Models\ImagingReport;
use App\Modules\Radiology\Models\ImagingStudy;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Radiology domain service.
 *
 * Responsibilities:
 *  - Catalog: search imaging study types.
 *  - Orders: place & track orders through the imaging workflow.
 *  - Reports: draft, finalize, amend, and verify radiologist reports.
 */
final class RadiologyService
{
    // ──────────────────────────────────────────────────────────────────────────
    //  Catalog
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Search the imaging study catalog.
     *
     * @return \Illuminate\Contracts\Pagination\LengthAwarePaginator<ImagingStudy>
     */
    public function searchCatalog(string $query = '', string $modality = ''): LengthAwarePaginator
    {
        return ImagingStudy::query()
            ->where('is_active', true)
            ->when($query !== '', fn ($q) => $q->where(function ($q) use ($query): void {
                $q->where('name', 'like', "%{$query}%")
                  ->orWhere('code', 'like', "%{$query}%")
                  ->orWhere('body_part', 'like', "%{$query}%");
            }))
            ->when($modality !== '', fn ($q) => $q->where('modality', $modality))
            ->orderBy('modality')
            ->orderBy('name')
            ->paginate(50);
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Orders
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Return all imaging orders for a visit.
     *
     * @return Collection<int, ImagingOrder>
     */
    public function ordersForVisit(Visit $visit): Collection
    {
        return ImagingOrder::query()
            ->where('visit_id', $visit->id)
            ->with(['study', 'report', 'orderedBy'])
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * Branch-wide worklist of recent imaging orders (radiologist dashboard).
     * Optionally filtered by status; cancelled orders are excluded by default.
     *
     * @return Collection<int, ImagingOrder>
     */
    public function worklist(string $status = '', int $limit = 100): Collection
    {
        return ImagingOrder::query()
            ->when(
                $status !== '',
                fn ($q) => $q->where('status', $status),
                fn ($q) => $q->where('status', '!=', 'cancelled'),
            )
            ->with(['study', 'report', 'orderedBy'])
            ->orderByRaw("CASE priority WHEN 'stat' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END")
            ->orderBy('created_at')
            ->limit($limit)
            ->get();
    }

    /**
     * Place a new imaging order for a visit.
     *
     * @param array<string, mixed> $data
     */
    public function placeOrder(Visit $visit, ImagingStudy $study, User $orderedBy, array $data = []): ImagingOrder
    {
        $existing = ImagingOrder::query()
            ->where('visit_id', $visit->id)
            ->where('imaging_study_id', $study->id)
            ->whereNotIn('status', ['cancelled'])
            ->first();

        if ($existing !== null) {
            throw new ConflictException(
                "Study '{$study->name}' is already ordered for this visit.",
                409,
                ['code' => 'IMAGING_ORDER_DUPLICATE'],
            );
        }

        return ImagingOrder::create([
            'branch_id'          => $visit->branch_id,
            'visit_id'           => $visit->id,
            'patient_id'         => $visit->patient_id,
            'ordered_by'         => $orderedBy->id,
            'imaging_study_id'   => $study->id,
            'status'             => 'pending',
            'priority'           => $data['priority']            ?? 'routine',
            'clinical_indication'=> $data['clinical_indication'] ?? null,
            'contrast_used'      => (bool) ($data['contrast_used'] ?? false),
            'contrast_agent'     => $data['contrast_agent']      ?? null,
            'notes'              => $data['notes']               ?? null,
        ]);
    }

    /**
     * Schedule the order (imaging slot assigned).
     */
    public function schedule(ImagingOrder $order, string $scheduledAt): ImagingOrder
    {
        $this->assertStatus($order, ['pending'], 'schedule');

        $order->update([
            'status'       => 'scheduled',
            'scheduled_at' => $scheduledAt,
        ]);

        return $order->refresh();
    }

    /**
     * Mark images as acquired (scan/X-ray done, ready for reporting).
     */
    public function markAcquired(ImagingOrder $order): ImagingOrder
    {
        $this->assertStatus($order, ['pending', 'scheduled'], 'mark as acquired');

        $order->update([
            'status'      => 'acquired',
            'acquired_at' => now(),
        ]);

        return $order->refresh();
    }

    /**
     * Cancel a pending or scheduled order.
     */
    public function cancel(ImagingOrder $order, string $reason = ''): ImagingOrder
    {
        $this->assertStatus($order, ['pending', 'scheduled'], 'cancel');

        $order->update([
            'status' => 'cancelled',
            'notes'  => $reason ?: $order->notes,
        ]);

        return $order->refresh();
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Reports
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Create or update a draft report.
     *
     * @param array<string, mixed> $reportData
     */
    public function saveReport(ImagingOrder $order, User $radiologist, array $reportData): ImagingReport
    {
        $this->assertStatus($order, ['acquired', 'reported'], 'write report for');

        return DB::transaction(function () use ($order, $radiologist, $reportData): ImagingReport {
            $report = ImagingReport::updateOrCreate(
                ['imaging_order_id' => $order->id],
                [
                    'reported_by'     => $radiologist->id,
                    'technique'       => (string) ($reportData['technique']       ?? ''),
                    'findings'        => (string) ($reportData['findings']         ?? ''),
                    'impression'      => (string) ($reportData['impression']       ?? ''),
                    'recommendations' => $reportData['recommendations']           ?? null,
                    'is_critical'     => (bool) ($reportData['is_critical']       ?? false),
                    'critical_notes'  => $reportData['critical_notes']            ?? null,
                    'status'          => 'draft',
                ],
            );

            return $report;
        });
    }

    /**
     * Finalize a draft report (moves order → "reported").
     */
    public function finalizeReport(ImagingReport $report, User $radiologist): ImagingReport
    {
        if ($report->status === 'final') {
            throw new ConflictException(
                'Report is already finalized.',
                409,
                ['code' => 'IMAGING_REPORT_ALREADY_FINAL'],
            );
        }

        return DB::transaction(function () use ($report, $radiologist): ImagingReport {
            $report->update([
                'status'       => 'final',
                'reported_by'  => $radiologist->id,
                'finalized_at' => now(),
            ]);

            $report->order()->update([
                'status'      => 'reported',
                'reported_at' => now(),
            ]);

            return $report->refresh();
        });
    }

    /**
     * Amend a finalized report (corrects errors after sign-off).
     *
     * @param array<string, mixed> $reportData
     */
    public function amendReport(ImagingReport $report, User $radiologist, array $reportData): ImagingReport
    {
        if ($report->status !== 'final') {
            throw new ConflictException(
                "Cannot amend a report with status '{$report->status}'.",
                409,
                ['code' => 'IMAGING_REPORT_NOT_FINAL'],
            );
        }

        $report->update(array_merge([
            'status'      => 'amended',
            'reported_by' => $radiologist->id,
        ], array_filter([
            'technique'       => $reportData['technique']       ?? null,
            'findings'        => $reportData['findings']         ?? null,
            'impression'      => $reportData['impression']       ?? null,
            'recommendations' => $reportData['recommendations']  ?? null,
            'critical_notes'  => $reportData['critical_notes']   ?? null,
        ], fn ($v) => $v !== null)));

        return $report->refresh();
    }

    /**
     * Verify / peer-review a final or amended report.
     */
    public function verifyReport(ImagingReport $report, User $verifier): ImagingReport
    {
        if ($report->verified_at !== null) {
            throw new ConflictException(
                'Report is already verified.',
                409,
                ['code' => 'IMAGING_REPORT_ALREADY_VERIFIED'],
            );
        }

        $report->update([
            'verified_by' => $verifier->id,
            'verified_at' => now(),
        ]);

        return $report->refresh();
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Helper
    // ──────────────────────────────────────────────────────────────────────────

    /** @param array<int, string> $allowed */
    private function assertStatus(ImagingOrder $order, array $allowed, string $action): void
    {
        if (! in_array($order->status, $allowed, true)) {
            throw new ConflictException(
                "Cannot {$action} an imaging order in status '{$order->status}'.",
                409,
                ['code' => 'IMAGING_ORDER_INVALID_TRANSITION'],
            );
        }
    }
}
