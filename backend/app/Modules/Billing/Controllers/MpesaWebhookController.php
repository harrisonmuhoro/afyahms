<?php

declare(strict_types=1);

namespace App\Modules\Billing\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Billing\Models\Bill;
use App\Modules\Billing\Services\BillingService;
use App\Modules\Billing\Services\MpesaDarajaService;
use App\Modules\Tenancy\Scopes\BranchScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class MpesaWebhookController extends Controller
{
    public function __construct(
        private readonly BillingService $billing,
        private readonly MpesaDarajaService $mpesa,
    ) {}

    public function stkCallback(Request $request): JsonResponse
    {
        $callback = $request->input('Body.stkCallback');
        if (! is_array($callback) || empty($callback['CheckoutRequestID'])) {
            return response()->json(['ResultCode' => 1, 'ResultDesc' => 'Invalid callback payload.'], 400);
        }

        $checkoutId = (string) $callback['CheckoutRequestID'];
        $resultCode = (int) ($callback['ResultCode'] ?? 1);

        $pendingBill = Bill::withoutGlobalScope(BranchScope::class)
            ->where('mpesa_checkout_request_id', $checkoutId)
            ->first(['id', 'mpesa_status']);
        if ($pendingBill === null || $pendingBill->mpesa_status === 'success') {
            return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
        }

        try {
            $verified = $this->mpesa->queryStkPush($checkoutId);
        } catch (RuntimeException $exception) {
            Log::warning('M-Pesa callback verification failed.', ['checkout_request_id' => $checkoutId]);
            return response()->json(['ResultCode' => 1, 'ResultDesc' => 'Payment verification is temporarily unavailable.'], 503);
        }

        if ((string) ($verified['ResponseCode'] ?? '') !== '0'
            || ! array_key_exists('ResultCode', $verified)
            || (int) $verified['ResultCode'] !== $resultCode) {
            Log::warning('M-Pesa callback did not match verified transaction status.', ['checkout_request_id' => $checkoutId]);
            return response()->json(['ResultCode' => 1, 'ResultDesc' => 'Payment status could not be verified.'], 422);
        }

        Log::info('M-Pesa STK callback received', [
            'checkout_request_id' => $checkoutId,
            'result_code' => $resultCode,
        ]);

        $accepted = DB::transaction(function () use ($callback, $checkoutId, $resultCode): bool {
            $bill = Bill::withoutGlobalScope(BranchScope::class)
                ->where('mpesa_checkout_request_id', $checkoutId)
                ->lockForUpdate()
                ->first();
            if ($bill === null) {
                Log::warning('M-Pesa callback did not match an invoice', [
                    'checkout_request_id' => $checkoutId,
                ]);
                return true;
            }

            if ($bill->mpesa_status === 'success') return true;

            $fields = [
                'mpesa_status' => $resultCode === 0 ? 'success' : 'failed',
                'mpesa_result_code' => $resultCode,
                'mpesa_result_description' => (string) ($callback['ResultDesc'] ?? 'Payment result received.'),
            ];

            if ($resultCode !== 0) {
                $bill->forceFill($fields)->save();
                return true;
            }

            $metadata = collect($callback['CallbackMetadata']['Item'] ?? [])->keyBy('Name');
            $receipt = (string) ($metadata->get('MpesaReceiptNumber')['Value'] ?? '');
            $amount = (float) ($metadata->get('Amount')['Value'] ?? $bill->mpesa_amount ?? 0);
            $phone = (string) ($metadata->get('PhoneNumber')['Value'] ?? $bill->mpesa_phone ?? '');
            $transactionDate = (string) ($metadata->get('TransactionDate')['Value'] ?? '');

            if ($receipt === ''
                || ! preg_match('/^[A-Z0-9]{8,20}$/i', $receipt)
                || abs($amount - (float) $bill->mpesa_amount) >= 0.01
                || $this->normalizeKenyanPhone($phone) !== $this->normalizeKenyanPhone((string) $bill->mpesa_phone)) {
                Log::warning('M-Pesa callback metadata did not match pending payment.', ['checkout_request_id' => $checkoutId]);
                return false;
            }

            $bill->forceFill($fields + [
                'mpesa_receipt' => $receipt ?: null,
                'mpesa_phone' => $phone ?: null,
                'mpesa_amount' => $amount,
                'mpesa_transaction_at' => $this->parseTransactionDate($transactionDate),
                'payment_method' => 'mpesa',
                'notes' => 'M-Pesa receipt: '.$receipt,
            ])->save();

            $this->billing->recordPayment(
                $bill,
                $amount,
                'mpesa',
                reference: $receipt !== '' ? $receipt : null,
                idempotencyKey: 'mpesa-stk:'.$checkoutId,
                metadata: [
                    'checkout_request_id' => $checkoutId,
                    'phone' => $phone ?: null,
                    'transaction_at' => $this->parseTransactionDate($transactionDate)?->toIso8601String(),
                ],
            );

            return true;
        });

        if (! $accepted) {
            return response()->json(['ResultCode' => 1, 'ResultDesc' => 'Payment metadata could not be verified.'], 422);
        }

        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    }

    private function parseTransactionDate(string $value): mixed
    {
        if ($value === '' || ! preg_match('/^\d{14}$/', $value)) return null;
        return \Carbon\Carbon::createFromFormat('YmdHis', $value);
    }

    private function normalizeKenyanPhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';
        if (str_starts_with($digits, '0')) {
            return '254'.substr($digits, 1);
        }
        if (strlen($digits) === 9 && (str_starts_with($digits, '7') || str_starts_with($digits, '1'))) {
            return '254'.$digits;
        }

        return $digits;
    }
}
