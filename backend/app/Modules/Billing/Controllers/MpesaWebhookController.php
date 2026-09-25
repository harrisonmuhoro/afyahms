<?php

declare(strict_types=1);

namespace App\Modules\Billing\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Billing\Models\Bill;
use App\Modules\Billing\Services\BillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

final class MpesaWebhookController extends Controller
{
    public function __construct(private readonly BillingService $billing) {}

    public function stkCallback(Request $request): JsonResponse
    {
        $callback = $request->input('Body.stkCallback');
        if (! is_array($callback) || empty($callback['CheckoutRequestID'])) {
            return response()->json(['ResultCode' => 1, 'ResultDesc' => 'Invalid callback payload.'], 400);
        }

        $checkoutId = (string) $callback['CheckoutRequestID'];
        $resultCode = (int) ($callback['ResultCode'] ?? 1);

        Log::info('M-Pesa STK callback received', [
            'checkout_request_id' => $checkoutId,
            'result_code' => $resultCode,
        ]);

        DB::transaction(function () use ($callback, $checkoutId, $resultCode): void {
            $bill = Bill::withoutGlobalScopes()->where('mpesa_checkout_request_id', $checkoutId)->lockForUpdate()->first();
            if ($bill === null) {
                Log::warning('M-Pesa callback did not match an invoice', [
                    'checkout_request_id' => $checkoutId,
                ]);
                return;
            }

            if ($bill->mpesa_status === 'success') return;

            $fields = [
                'mpesa_status' => $resultCode === 0 ? 'success' : 'failed',
                'mpesa_result_code' => $resultCode,
                'mpesa_result_description' => (string) ($callback['ResultDesc'] ?? 'Payment result received.'),
            ];

            if ($resultCode !== 0) {
                $bill->forceFill($fields)->save();
                return;
            }

            $metadata = collect($callback['CallbackMetadata']['Item'] ?? [])->keyBy('Name');
            $receipt = (string) ($metadata->get('MpesaReceiptNumber')['Value'] ?? '');
            $amount = (float) ($metadata->get('Amount')['Value'] ?? $bill->mpesa_amount ?? 0);
            $phone = (string) ($metadata->get('PhoneNumber')['Value'] ?? $bill->mpesa_phone ?? '');
            $transactionDate = (string) ($metadata->get('TransactionDate')['Value'] ?? '');

            $bill->forceFill($fields + [
                'mpesa_receipt' => $receipt ?: null,
                'mpesa_phone' => $phone ?: null,
                'mpesa_amount' => $amount,
                'mpesa_transaction_at' => $this->parseTransactionDate($transactionDate),
                'payment_method' => 'mpesa',
                'notes' => 'M-Pesa receipt: '.$receipt,
            ])->save();

            $this->billing->recordPayment($bill, $amount, 'mpesa');
        });

        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    }

    private function parseTransactionDate(string $value): mixed
    {
        if ($value === '' || ! preg_match('/^\d{14}$/', $value)) return null;
        return \Carbon\Carbon::createFromFormat('YmdHis', $value);
    }
}
