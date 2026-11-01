<?php

declare(strict_types=1);

namespace App\Modules\Billing\Services;

use App\Modules\Billing\Models\Bill;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

final class MpesaDarajaService
{
    /** @return array{merchant_request_id: string, checkout_request_id: string, customer_message: string} */
    public function initiateStkPush(Bill $bill, string $phone, float $amount): array
    {
        $gateway = config('mpesa.gateways.mpesa_daraja');
        $shortcode = (string) ($gateway['lipa_na_mpesa_online_shortcode'] ?: $gateway['shortcode']);
        $passkey = (string) ($gateway['lipa_na_mpesa_online_passkey'] ?: $gateway['passkey']);
        $callbackUrl = (string) ($gateway['callback_urls']['stk'] ?? '');

        if ($gateway['consumer_key'] === null || $gateway['consumer_secret'] === null || $passkey === '' || $callbackUrl === '' || ! filter_var($callbackUrl, FILTER_VALIDATE_URL)) {
            throw new RuntimeException('M-Pesa is not fully configured. Set the Daraja credentials, passkey, and public STK callback URL.');
        }

        $phone = $this->normalizePhone($phone);
        $timestamp = now()->format('YmdHis');
        $password = base64_encode($shortcode.$passkey.$timestamp);
        $token = $this->accessToken($gateway);

        $response = Http::withToken($token)
            ->acceptJson()
            ->timeout((int) $gateway['timeout'])
            ->retry((int) $gateway['retry']['times'], fn (int $attempt): int => (int) $gateway['retry']['backoff_ms'][$attempt - 1] ?? 1500)
            ->post(rtrim((string) $gateway['base_url'], '/').'/mpesa/stkpush/v1/processrequest', [
                'BusinessShortCode' => $shortcode,
                'Password' => $password,
                'Timestamp' => $timestamp,
                'TransactionType' => 'CustomerPayBillOnline',
                'Amount' => max(1, (int) ceil($amount)),
                'PartyA' => $phone,
                'PartyB' => $shortcode,
                'PhoneNumber' => $phone,
                'CallBackURL' => $callbackUrl,
                'AccountReference' => 'INV'.substr(str_replace('-', '', $bill->public_id), 0, 9),
                'TransactionDesc' => 'Afya bill payment',
            ]);

        if ($response->failed() || $response->json('ResponseCode') !== '0') {
            throw new RuntimeException((string) ($response->json('errorMessage') ?: $response->json('ResponseDescription') ?: 'Safaricom rejected the STK request.'));
        }

        return [
            'merchant_request_id' => (string) $response->json('MerchantRequestID'),
            'checkout_request_id' => (string) $response->json('CheckoutRequestID'),
            'customer_message' => (string) ($response->json('CustomerMessage') ?: 'STK prompt sent to your phone.'),
        ];
    }

    /** @return array<string, mixed> */
    public function queryStkPush(string $checkoutRequestId): array
    {
        $gateway = config('mpesa.gateways.mpesa_daraja');
        $shortcode = (string) ($gateway['lipa_na_mpesa_online_shortcode'] ?: $gateway['shortcode']);
        $passkey = (string) ($gateway['lipa_na_mpesa_online_passkey'] ?: $gateway['passkey']);
        if ($checkoutRequestId === '' || $passkey === '') {
            throw new RuntimeException('M-Pesa STK query is not configured.');
        }

        $timestamp = now()->format('YmdHis');
        $response = Http::withToken($this->accessToken($gateway))
            ->acceptJson()
            ->timeout((int) $gateway['timeout'])
            ->post(rtrim((string) $gateway['base_url'], '/').'/mpesa/stkpushquery/v1/query', [
                'BusinessShortCode' => $shortcode,
                'Password' => base64_encode($shortcode.$passkey.$timestamp),
                'Timestamp' => $timestamp,
                'CheckoutRequestID' => $checkoutRequestId,
            ]);

        if ($response->failed() || ! is_array($response->json())) {
            throw new RuntimeException('Unable to verify the M-Pesa STK transaction.');
        }

        return $response->json();
    }

    /** @param array<string, mixed> $gateway */
    private function accessToken(array $gateway): string
    {
        return Cache::remember('mpesa.daraja.access_token', now()->addMinutes(50), function () use ($gateway): string {
            $response = Http::withBasicAuth((string) $gateway['consumer_key'], (string) $gateway['consumer_secret'])
                ->acceptJson()
                ->timeout((int) $gateway['timeout'])
                ->get(rtrim((string) $gateway['base_url'], '/').'/oauth/v1/generate', ['grant_type' => 'client_credentials']);

            if ($response->failed() || ! is_string($response->json('access_token'))) {
                throw new RuntimeException('Unable to authenticate with Safaricom Daraja.');
            }

            return (string) $response->json('access_token');
        });
    }

    private function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';
        if (str_starts_with($digits, '0')) $digits = '254'.substr($digits, 1);
        if (strlen($digits) === 9 && (str_starts_with($digits, '7') || str_starts_with($digits, '1'))) $digits = '254'.$digits;

        if (! preg_match('/^254[17]\d{8}$/', $digits)) {
            throw new RuntimeException('Enter a valid Kenyan M-Pesa phone number.');
        }

        return $digits;
    }
}
