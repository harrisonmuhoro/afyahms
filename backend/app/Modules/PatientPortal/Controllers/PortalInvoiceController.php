<?php

declare(strict_types=1);

namespace App\Modules\PatientPortal\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Billing\Models\Bill;
use App\Modules\Billing\Models\BillItem;
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
    public function pay(Request $request, string $publicId): JsonResponse
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

        // Simulate successful payment (replace with Daraja STK push in production)
        $bill->update([
            'paid_amount'    => $bill->total_amount,
            'status'         => 'cleared',
            'payment_method' => 'mpesa',
            'notes'          => 'M-Pesa payment via patient portal. Phone: ' . $request->string('phone'),
        ]);

        return response()->json([
            'message' => 'Payment recorded successfully.',
            'bill'    => $bill->fresh(['items']),
        ]);
    }
}
