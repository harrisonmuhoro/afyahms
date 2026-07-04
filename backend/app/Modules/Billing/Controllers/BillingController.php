<?php

declare(strict_types=1);

namespace App\Modules\Billing\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Billing\Models\Bill;
use App\Modules\Billing\Services\BillingService;
use App\Modules\Queue\Models\Visit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Billing API controller.
 *
 * Routes:
 *   GET  /api/v1/billing/visits/{visit}/bill  — show bill for a visit
 *   POST /api/v1/billing/visits/{visit}/bill/items  — add a line-item
 *   POST /api/v1/billing/visits/{visit}/bill/pay    — record a payment
 *   POST /api/v1/billing/visits/{visit}/bill/clear  — staff mark cleared
 *   POST /api/v1/billing/visits/{visit}/bill/waive  — staff mark waived
 *   GET  /api/v1/billing/visits/{visit}/bill/status — is-cleared check (for BIL gate)
 */
final class BillingController extends Controller
{
    public function __construct(private readonly BillingService $billing) {}

    /** GET /api/v1/billing/visits/{visit}/bill */
    public function show(Visit $visit): JsonResponse
    {
        $bill = $this->billing->billForVisit($visit);
        $bill->load('items');

        return response()->json(['data' => $this->billData($bill)]);
    }

    /** GET /api/v1/billing/visits/{visit}/bill/status */
    public function status(Visit $visit): JsonResponse
    {
        $cleared = $this->billing->isBillCleared($visit);

        return response()->json([
            'data' => [
                'visit_id'  => $visit->id,
                'is_cleared' => $cleared,
            ],
        ]);
    }

    /** POST /api/v1/billing/visits/{visit}/bill/items */
    public function addItem(Request $request, Visit $visit): JsonResponse
    {
        $validated = $request->validate([
            'description' => ['required', 'string', 'max:255'],
            'category'    => ['nullable', 'string', 'max:60'],
            'unit_price'  => ['required', 'numeric', 'min:0'],
            'quantity'    => ['nullable', 'integer', 'min:1'],
        ]);

        $bill = $this->billing->billForVisit($visit);
        $item = $this->billing->addItem($bill, $validated);
        $bill->refresh()->load('items');

        return response()->json(['data' => $this->billData($bill)], 201);
    }

    /** POST /api/v1/billing/visits/{visit}/bill/pay */
    public function recordPayment(Request $request, Visit $visit): JsonResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'method' => ['nullable', 'string', 'max:40'],
        ]);

        $bill = $this->billing->billForVisit($visit);
        $bill = $this->billing->recordPayment(
            $bill,
            (float) $validated['amount'],
            (string) ($validated['method'] ?? 'cash'),
            $request->user(),
        );
        $bill->load('items');

        return response()->json(['data' => $this->billData($bill)]);
    }

    /** POST /api/v1/billing/visits/{visit}/bill/clear */
    public function markCleared(Request $request, Visit $visit): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $bill = $this->billing->billForVisit($visit);
        $bill = $this->billing->markCleared($bill, (string) ($validated['reason'] ?? ''), $request->user());
        $bill->load('items');

        return response()->json(['data' => $this->billData($bill)]);
    }

    /** POST /api/v1/billing/visits/{visit}/bill/waive */
    public function markWaived(Request $request, Visit $visit): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $bill = $this->billing->billForVisit($visit);
        $bill = $this->billing->markWaived($bill, (string) ($validated['reason'] ?? ''), $request->user());
        $bill->load('items');

        return response()->json(['data' => $this->billData($bill)]);
    }

    /** @return array<string, mixed> */
    private function billData(Bill $bill): array
    {
        return [
            'id'             => $bill->id,
            'public_id'      => $bill->public_id,
            'visit_id'       => $bill->visit_id,
            'patient_id'     => $bill->patient_id,
            'total_amount'   => $bill->total_amount,
            'paid_amount'    => $bill->paid_amount,
            'balance'        => max(0, $bill->total_amount - $bill->paid_amount),
            'status'         => $bill->status,
            'is_cleared'     => $bill->isCleared(),
            'payment_method' => $bill->payment_method,
            'notes'          => $bill->notes,
            'cleared_at'     => $bill->cleared_at?->toIso8601String(),
            'items'          => $bill->items->map(fn ($i) => [
                'id'          => $i->id,
                'description' => $i->description,
                'category'    => $i->category,
                'unit_price'  => $i->unit_price,
                'quantity'    => $i->quantity,
                'total_price' => $i->total_price,
            ])->values()->all(),
        ];
    }
}
