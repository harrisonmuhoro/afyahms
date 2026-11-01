<?php

declare(strict_types=1);

namespace App\Modules\PatientPortal\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Billing\Models\Bill;
use App\Modules\Billing\Models\BillItem;
use App\Modules\Billing\Services\MpesaDarajaService;
use RuntimeException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PortalInvoiceController extends Controller
{
    /**
     * List all bills for the authenticated patient.
     */
    public function index(Request $request): JsonResponse
    {
        $patientId = Auth::user()->patient_id;

        $bills = Bill::withoutGlobalScope(\App\Modules\Tenancy\Scopes\BranchScope::class)
            ->where('patient_id', $patientId)
            ->with(['items', 'visit:id,created_at'])
            ->latest()
            ->paginate($request->integer('per_page', 20));

        return response()->json($bills);
    }

    /**
     * Simulate an M-Pesa payment for a specific bill.
     * In production, this would initiate a real STK push via Daraja API.
     */
    public function pay(Request $request, string $publicId, MpesaDarajaService $mpesa): JsonResponse
    {
        $patientId = Auth::user()->patient_id;

        $bill = Bill::withoutGlobalScope(\App\Modules\Tenancy\Scopes\BranchScope::class)
            ->where('public_id', $publicId)
            ->where('patient_id', $patientId)
            ->firstOrFail();

        if ($bill->isCleared()) {
            return response()->json(['message' => 'This bill has already been cleared.'], 422);
        }

        $request->validate([
            'phone' => ['required', 'string', 'min:9', 'max:15'],
        ]);

        try {
            $amount = (float) ceil(max(0, (float) $bill->total_amount - (float) $bill->paid_amount));
            $result = $mpesa->initiateStkPush($bill, $request->string('phone')->toString(), $amount);
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        $bill->forceFill([
            'mpesa_merchant_request_id' => $result['merchant_request_id'],
            'mpesa_checkout_request_id' => $result['checkout_request_id'],
            'mpesa_phone' => $request->string('phone')->toString(),
            'mpesa_amount' => $amount,
            'mpesa_status' => 'pending',
            'mpesa_result_code' => null,
            'mpesa_result_description' => $result['customer_message'],
        ])->save();

        return response()->json([
            'message' => $result['customer_message'],
            'status' => 'pending',
            'bill'    => $bill->fresh(['items']),
        ]);
    }

    public function paymentStatus(Request $request, string $publicId): JsonResponse
    {
        $bill = Bill::withoutGlobalScope(\App\Modules\Tenancy\Scopes\BranchScope::class)
            ->where('public_id', $publicId)
            ->where('patient_id', Auth::user()->patient_id)
            ->firstOrFail();

        return response()->json([
            'status' => $bill->mpesa_status,
            'message' => $bill->mpesa_result_description,
            'bill' => $bill->load('items'),
        ]);
    }
}
