<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Notification Channel Manager (foundation §8)
    |--------------------------------------------------------------------------
    | Channel drivers are resolved via interface; app code never calls
    | AfricasTalking or Mailgun SDKs directly.
    */

    'sms' => [
        'default' => env('NOTIFICATION_SMS_DRIVER', 'africastalking'),
        'drivers' => [
            'africastalking' => [
                'api_key'  => env('AFRICASTALKING_API_KEY'),
                'username' => env('AFRICASTALKING_USERNAME', 'sandbox'),
                'sender_id' => env('AFRICASTALKING_SENDER_ID', 'AFYA'),
                'base_url' => env('AFRICASTALKING_BASE_URL', 'https://api.africastalking.com/version1'),
            ],
            'log' => [
                // dev-only fallback — writes SMS payloads to log instead of HTTP
            ],
        ],
    ],

    'email' => [
        'default' => env('NOTIFICATION_EMAIL_DRIVER', 'mailgun'),
        'drivers' => [
            'mailgun' => [
                'domain'   => env('MAILGUN_DOMAIN'),
                'secret'   => env('MAILGUN_SECRET'),
                'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
            ],
            'resend' => [
                'key' => env('RESEND_API_KEY'),
            ],
            'log' => [],
        ],
    ],

    /*
    | Per-event routing. Falls back to default if unset.
    */
    'routing' => [
        'appointment_reminder' => ['sms'],
        'result_ready'         => ['sms', 'email'],
        'payment_confirmed'    => ['sms', 'email'],
        'otp_code'             => ['sms'],
        'claim_status'         => ['email'],
        'queue_called'         => ['sms'],
    ],

    'retry' => [
        'times'  => 5,
        'backoff' => [30, 60, 120, 300, 600],   // seconds
    ],

    'rate_limit_per_minute' => (int) env('NOTIFICATIONS_RATE_LIMIT', 60),
];