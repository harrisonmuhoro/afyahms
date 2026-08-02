<?php

declare(strict_types=1);

namespace App\Modules\Radiology\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Queue\Models\Visit;
use App\Modules\Radiology\Models\ImagingOrder;
use App\Modules\Radiology\Models\ImagingReport;
use App\Modules\Radiology\Models\ImagingStudy;
use App\Modules\Radiology\Services\RadiologyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Radiology API controller.
 *
 * Routes:
 *   GET  /api/v1/radiology/studies                         — catalog search
 *   GET  /api/v1/radiology/visits/{visit}/orders           — orders for a visit
 *   POST /api/v1/radiology/visits/{visit}/orders           — place new order
 *   POST /api/v1/radiology/orders/{order}/schedule         — schedule order
 *   POST /api/v1/radiology/orders/{order}/acquire          — mark images acquired
 *   POST /api/v1/radiology/orders/{order}/cancel           — cancel order
 *   POST /api/v1/radiology/orders/{order}/report           — save/update draft report
 *   POST /api/v1/radiology/reports/{report}/finalize       — finalize report
 *   POST /api/v1/radiology/reports/{report}/amend          — amend final report
 *   POST /api/v1/radiology/reports/{report}/verify         — verify/peer-review
 */
final class RadiologyController extends Controller
{
    public function __construct(private readonly RadiologyService $radiology) {}

    // ─── Catalog ────────────────────────────────────────────────────────────

    /** GET /api/v1/radiology/studies */
    public function catalog(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q'        => ['nullable', 'string', 'max:100'],
            'modality' => ['nullable', 'string', 'max:40'],
        ]);

        $studies = $this->radiology->searchCatalog(
            query:    (string) ($validated['q']        ?? ''),
            modality: (string) ($validated['modality'] ?? ''),
        );

        return response()->json(['data' => $studies]);
    }

    // ─── Orders ─────────────────────────────────────────────────────────────

    /** GET /api/v1/radiology/orders — branch-wide worklist for the radiologist dashboard */
    public function worklist(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'in:pending,scheduled,acquired,reported,cancelled'],
        ]);

        $orders = $this->radiology->worklist((string) ($validated['status'] ?? ''));

        return response()->json([
            'data' => $orders->map(fn ($o) => $this->orderData($o))->values()->all(),
        ]);
    }

    /** GET /api/v1/radiology/visits/{visit}/orders */
    public function index(Visit $visit): JsonResponse
    {
        $orders = $this->radiology->ordersForVisit($visit);

        return response()->json([
            'data' => $orders->map(fn ($o) => $this->orderData($o))->values()->all(),
        ]);
    }

    /** POST /api/v1/radiology/visits/{visit}/orders */
    public function store(Request $request, Visit $visit): JsonResponse
    {
        $validated = $request->validate([
            'imaging_study_id'    => ['required', 'integer', 'exists:imaging_studies,id'],
            'priority'            => ['nullable', 'in:routine,urgent,stat'],
            'clinical_indication' => ['nullable', 'string', 'max:1000'],
            'contrast_used'       => ['nullable', 'boolean'],
            'contrast_agent'      => ['nullable', 'string', 'max:100'],
            'notes'               => ['nullable', 'string', 'max:1000'],
        ]);

        $study = ImagingStudy::findOrFail((int) $validated['imaging_study_id']);
        $order = $this->radiology->placeOrder($visit, $study, $request->user(), $validated);
        $order->load(['study', 'report', 'orderedBy']);

        return response()->json(['data' => $this->orderData($order)], 201);
    }

    /** POST /api/v1/radiology/orders/{order}/schedule */
    public function schedule(Request $request, ImagingOrder $order): JsonResponse
    {
        $validated = $request->validate([
            'scheduled_at' => ['required', 'date'],
        ]);

        $order = $this->radiology->schedule($order, $validated['scheduled_at']);
        $order->load(['study', 'report', 'orderedBy']);

        return response()->json(['data' => $this->orderData($order)]);
    }

    /** POST /api/v1/radiology/orders/{order}/acquire */
    public function acquire(ImagingOrder $order): JsonResponse
    {
        $order = $this->radiology->markAcquired($order);
        $order->load(['study', 'report', 'orderedBy']);

        return response()->json(['data' => $this->orderData($order)]);
    }

    /** POST /api/v1/radiology/orders/{order}/cancel */
    public function cancel(Request $request, ImagingOrder $order): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $order = $this->radiology->cancel($order, (string) ($validated['reason'] ?? ''));
        $order->load(['study', 'report', 'orderedBy']);

        return response()->json(['data' => $this->orderData($order)]);
    }

    // ─── Reports ────────────────────────────────────────────────────────────

    /** POST /api/v1/radiology/orders/{order}/report */
    public function saveReport(Request $request, ImagingOrder $order): JsonResponse
    {
        $validated = $request->validate([
            'technique'       => ['required', 'string'],
            'findings'        => ['required', 'string'],
            'impression'      => ['required', 'string'],
            'recommendations' => ['nullable', 'string'],
            'is_critical'     => ['nullable', 'boolean'],
            'critical_notes'  => ['nullable', 'string', 'max:1000'],
        ]);

        $report = $this->radiology->saveReport($order, $request->user(), $validated);
        $report->load(['reportedBy', 'verifiedBy']);

        return response()->json(['data' => $this->reportData($report)], 201);
    }

    /** POST /api/v1/radiology/reports/{report}/finalize */
    public function finalize(Request $request, ImagingReport $report): JsonResponse
    {
        $report = $this->radiology->finalizeReport($report, $request->user());
        $report->load(['reportedBy', 'verifiedBy']);

        return response()->json(['data' => $this->reportData($report)]);
    }

    /** POST /api/v1/radiology/reports/{report}/amend */
    public function amend(Request $request, ImagingReport $report): JsonResponse
    {
        $validated = $request->validate([
            'technique'       => ['nullable', 'string'],
            'findings'        => ['nullable', 'string'],
            'impression'      => ['nullable', 'string'],
            'recommendations' => ['nullable', 'string'],
            'critical_notes'  => ['nullable', 'string', 'max:1000'],
        ]);

        $report = $this->radiology->amendReport($report, $request->user(), $validated);
        $report->load(['reportedBy', 'verifiedBy']);

        return response()->json(['data' => $this->reportData($report)]);
    }

    /** POST /api/v1/radiology/reports/{report}/verify */
    public function verify(Request $request, ImagingReport $report): JsonResponse
    {
        $report = $this->radiology->verifyReport($report, $request->user());
        $report->load(['reportedBy', 'verifiedBy']);

        return response()->json(['data' => $this->reportData($report)]);
    }

    // ─── Private helpers ────────────────────────────────────────────────────

    /** @return array<string, mixed> */
    private function orderData(ImagingOrder $order): array
    {
        return [
            'id'                  => $order->id,
            'public_id'           => $order->public_id,
            'visit_id'            => $order->visit_id,
            'patient_id'          => $order->patient_id,
            'status'              => $order->status,
            'priority'            => $order->priority,
            'clinical_indication' => $order->clinical_indication,
            'contrast_used'       => $order->contrast_used,
            'contrast_agent'      => $order->contrast_agent,
            'notes'               => $order->notes,
            'scheduled_at'        => $order->scheduled_at?->toIso8601String(),
            'acquired_at'         => $order->acquired_at?->toIso8601String(),
            'reported_at'         => $order->reported_at?->toIso8601String(),
            'created_at'          => $order->created_at?->toIso8601String(),
            'study' => $order->relationLoaded('study') && $order->study !== null
                ? [
                    'id'                 => $order->study->id,
                    'name'               => $order->study->name,
                    'code'               => $order->study->code,
                    'modality'           => $order->study->modality,
                    'body_part'          => $order->study->body_part,
                    'turnaround_minutes' => $order->study->turnaround_minutes,
                    'price'              => $order->study->price,
                    'requires_contrast'  => $order->study->requires_contrast,
                ]
                : null,
            'ordered_by' => $order->relationLoaded('orderedBy') && $order->orderedBy !== null
                ? [
                    'id'   => $order->orderedBy->id,
                    'name' => $order->orderedBy->name,
                ]
                : null,
            'report' => $order->relationLoaded('report') && $order->report !== null
                ? $this->reportData($order->report)
                : null,
        ];
    }

    /** @return array<string, mixed> */
    private function reportData(ImagingReport $report): array
    {
        return [
            'id'               => $report->id,
            'imaging_order_id' => $report->imaging_order_id,
            'technique'        => $report->technique,
            'findings'         => $report->findings,
            'impression'       => $report->impression,
            'recommendations'  => $report->recommendations,
            'status'           => $report->status,
            'is_critical'      => $report->is_critical,
            'critical_notes'   => $report->critical_notes,
            'finalized_at'     => $report->finalized_at?->toIso8601String(),
            'verified_at'      => $report->verified_at?->toIso8601String(),
            'created_at'       => $report->created_at?->toIso8601String(),
            'reported_by' => $report->relationLoaded('reportedBy') && $report->reportedBy !== null
                ? [
                    'id'   => $report->reportedBy->id,
                    'name' => $report->reportedBy->name,
                ]
                : null,
            'verified_by' => $report->relationLoaded('verifiedBy') && $report->verifiedBy !== null
                ? [
                    'id'   => $report->verifiedBy->id,
                    'name' => $report->verifiedBy->name,
                ]
                : null,
        ];
    }
}
