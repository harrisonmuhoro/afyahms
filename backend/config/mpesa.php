<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | M-Pesa Daraja configuration (foundation §9)
    |--------------------------------------------------------------------------
    */

    'default' => env('MPESA_DEFAULT_GATEWAY', 'mpesa_daraja'),

    'gateways' => [
        'mpesa_daraja' => [
            'env'         => env('MPESA_ENV', 'sandbox'),
            'base_url'    => env('MPESA_BASE_URL', 'https://sandbox.safaricom.co.ke'),
            'consumer_key'    => env('MPESA_CONSUMER_KEY'),
            'consumer_secret' => env('MPESA_CONSUMER_SECRET'),
            'shortcode'   => env('MPESA_SHORTCODE', '174379'),
            'passkey'     => env('MPESA_PASSKEY'),
            'initiator'   => env('MPESA_INITIATOR_NAME', 'testapi'),
            'security_credential' => env('MPESA_SECURITY_CREDENTIAL'),
            'lipa_na_mpesa_online_shortcode' => env('MPESA_LIPA_NA_MPESA_SHORTCODE'),
            'lipa_na_mpesa_online_passkey'   => env('MPESA_LIPA_NA_MPESA_PASSKEY'),

            'callback_urls' => [
                'stk' => env('MPESA_STK_CALLBACK_URL'),
                'b2c' => env('MPESA_B2C_CALLBACK_URL'),
                'c2b_validate'  => env('MPESA_C2B_VALIDATE_URL'),
                'c2b_confirm'   => env('MPESA_C2B_CONFIRM_URL'),
            ],

            'timeout' => 30,
            'retry'   => [
                'times' => 3,
                'backoff_ms' => [500, 1500, 4000],
            ],

            /*
             | Idempotency keys: which field to dedupe on for each callback.
             | Per foundation §9 — CheckoutRequestID / mpesa_receipt.
             */
            'idempotency_keys' => [
                'stk_callback'   => 'CheckoutRequestID',
                'c2b_confirm'    => 'TransID',
                'b2c_result'     => 'TransactionReceipt',
            ],
        ],

        'cash' => [
            // No remote config; cash payments are recorded locally.
        ],
    ],

    'currency' => 'KES',
];