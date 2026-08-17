<?php

declare(strict_types=1);

namespace App\Modules\Laboratory\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Laboratory\Models\LabOrder;
use App\Modules\Laboratory\Models\LabResult;
use App\Modules\Laboratory\Models\LabTest;
use App\Modules\Laboratory\Services\LaboratoryService;
use App\Modules\Queue\Models\Visit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Laboratory API controller.
 *
 * Routes:
 *   GET  /api/v1/lab/tests                          — catalog search
 *   GET  /api/v1/lab/visits/{visit}/orders          — orders for a visit
 *   POST /api/v1/lab/visits/{visit}/orders          — place new order
 *   POST /api/v1/lab/orders/{order}/collect         — mark specimen collected
 *   POST /api/v1/lab/orders/{order}/process         — mark processing
 *   POST /api/v1/lab/orders/{order}/cancel          — cancel order
 *   POST /api/v1/lab/orders/{order}/result          — record result
 *   POST /api/v1/lab/results/{result}/verify        — verify result (sign-off)
 */
final class LaboratoryController extends Controller
{
    public function __construct(private readonly LaboratoryService $lab) {}

    // ─── Catalog ────────────────────────────────────────────────────────────

    /** GET /api/v1/lab/tests */
    public function catalog(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q'        => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:60'],
        ]);

        $tests = $this->lab->searchCatalog(
            query:    (string) ($validated['q']        ?? ''),
            category: (string) ($validated['category'] ?? ''),
        );

        return response()->json(['data' => $tests]);
    }

    // ─── Orders ─────────────────────────────────────────────────────────────

    /** GET /api/v1/lab/orders — branch-wide worklist for the lab dashboard */
    public function worklist(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'in:pending,collected,processing,resulted,cancelled'],
        ]);

        $orders = $this->lab->worklist((string) ($validated['status'] ?? ''));

        return response()->json([
            'data' => $orders->map(fn ($o) => $this->orderData($o))->values()->all(),
        ]);
    }

    /** GET /api/v1/lab/visits/{visit}/orders */
    public function index(int $visit): JsonResponse
    {
        $visitModel = \App\Modules\Queue\Models\Visit::withoutGlobalScope(
            \App\Modules\Tenancy\Scopes\BranchScope::class
        )->findOrFail($visit);

        $orders = $this->lab->ordersForVisit($visitModel);

        return response()->json([
            'data' => $orders->map(fn ($o) => $this->orderData($o))->values()->all(),
        ]);
    }

    /** POST /api/v1/lab/visits/{visit}/orders */
    public function store(Request $request, int $visit): JsonResponse
    {
        $visitModel = \App\Modules\Queue\Models\Visit::withoutGlobalScope(
            \App\Modules\Tenancy\Scopes\BranchScope::class
        )->findOrFail($visit);

        $validated = $request->validate([
            'lab_test_id'    => ['required', 'integer', 'exists:lab_tests,id'],
            'priority'       => ['nullable', 'in:routine,urgent,stat'],
            'clinical_notes' => ['nullable', 'string', 'max:1000'],
            'specimen_type'  => ['nullable', 'string', 'max:40'],
        ]);

        $test  = LabTest::findOrFail((int) $validated['lab_test_id']);
        $order = $this->lab->placeOrder($visitModel, $test, $request->user(), $validated);
        $order->load(['test', 'result', 'orderedBy']);

        return response()->json(['data' => $this->orderData($order)], 201);
    }


    /** POST /api/v1/lab/orders/{order}/collect */
    public function collect(LabOrder $order): JsonResponse
    {
        $order = $this->lab->markCollected($order);
        $order->load(['test', 'result', 'orderedBy']);

        return response()->json(['data' => $this->orderData($order)]);
    }

    /** POST /api/v1/lab/orders/{order}/process */
    public function process(LabOrder $order): JsonResponse
    {
        $order = $this->lab->markProcessing($order);
        $order->load(['test', 'result', 'orderedBy']);

        return response()->json(['data' => $this->orderData($order)]);
    }

    /** POST /api/v1/lab/orders/{order}/cancel */
    public function cancel(Request $request, LabOrder $order): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $order = $this->lab->cancel($order, (string) ($validated['reason'] ?? ''));
        $order->load(['test', 'result', 'orderedBy']);

        return response()->json(['data' => $this->orderData($order)]);
    }

    // ─── Results ────────────────────────────────────────────────────────────

    /** POST /api/v1/lab/orders/{order}/result */
    public function recordResult(Request $request, LabOrder $order): JsonResponse
    {
        $validated = $request->validate([
            'findings'        => ['required', 'string'],
            'interpretation'  => ['nullable', 'in:normal,abnormal,critical'],
            'reference_range' => ['nullable', 'string', 'max:100'],
            'unit'            => ['nullable', 'string', 'max:40'],
            'value'           => ['nullable', 'string', 'max:100'],
            'is_critical'     => ['nullable', 'boolean'],
            'notes'           => ['nullable', 'string', 'max:1000'],
        ]);

        $result = $this->lab->recordResult($order, $request->user(), $validated);
        $result->load(['reportedBy', 'verifiedBy']);

        return response()->json(['data' => $this->resultData($result)], 201);
    }

    /** POST /api/v1/lab/results/{result}/verify */
    public function verify(Request $request, LabResult $result): JsonResponse
    {
        $result = $this->lab->verifyResult($result, $request->user());
        
        // Notify the ordering physician asynchronously
        $result->loadMissing('order');
        if ($result->order) {
            \App\Jobs\NotifyLabResultReady::dispatch($result->order);
        }

        $result->load(['reportedBy', 'verifiedBy']);

        return response()->json(['data' => $this->resultData($result)]);
    }

    // ─── Private helpers ────────────────────────────────────────────────────

    /** @return array<string, mixed> */
    private function orderData(LabOrder $order): array
    {
        return [
            'public_id'      => $order->public_id,
            'visit_id'       => $order->visit_id,
            'patient_id'     => $order->patient_id,
            'status'         => $order->status,
            'priority'       => $order->priority,
            'clinical_notes' => $order->clinical_notes,
            'specimen_type'  => $order->specimen_type,
            'collected_at'   => $order->collected_at?->toIso8601String(),
            'resulted_at'    => $order->resulted_at?->toIso8601String(),
            'created_at'     => $order->created_at?->toIso8601String(),
            'test'           => $order->relationLoaded('test') && $order->test !== null
                ? [
                    'id'                 => $order->test->id,
                    'name'               => $order->test->name,
                    'code'               => $order->test->code,
                    'category'           => $order->test->category,
                    'turnaround_minutes' => $order->test->turnaround_minutes,
                    'price'              => $order->test->price,
                ]
                : null,
            'ordered_by' => $order->relationLoaded('orderedBy') && $order->orderedBy !== null
                ? [
                    'id'   => $order->orderedBy->id,
                    'name' => $order->orderedBy->name,
                ]
                : null,
            'result' => $order->relationLoaded('result') && $order->result !== null
                ? $this->resultData($order->result)
                : null,
        ];
    }

    /** @return array<string, mixed> */
    private function resultData(LabResult $result): array
    {
        return [
            'lab_order_public_id' => $result->order?->public_id, // Safely reference the order UUID
            'findings'        => $result->findings,
            'interpretation'  => $result->interpretation,
            'reference_range' => $result->reference_range,
            'unit'            => $result->unit,
            'value'           => $result->value,
            'is_critical'     => $result->is_critical,
            'notes'           => $result->notes,
            'verified_at'     => $result->verified_at?->toIso8601String(),
            'created_at'      => $result->created_at?->toIso8601String(),
            'reported_by' => $result->relationLoaded('reportedBy') && $result->reportedBy !== null
                ? [
                    'id'   => $result->reportedBy->id,
                    'name' => $result->reportedBy->name,
                ]
                : null,
            'verified_by' => $result->relationLoaded('verifiedBy') && $result->verifiedBy !== null
                ? [
                    'id'   => $result->verifiedBy->id,
                    'name' => $result->verifiedBy->name,
                ]
                : null,
        ];
    }
}
