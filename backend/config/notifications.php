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
        // Appointment reminders currently use email by default. WhatsApp can
        // be enabled with APPOINTMENT_REMINDER_CHANNELS=email,whatsapp.
        'appointment_reminder' => array_values(array_filter(array_map(
            'trim',
            explode(',', env('APPOINTMENT_REMINDER_CHANNELS', 'email')),
        ))),
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

    'whatsapp' => [
        'access_token' => env('WHATSAPP_ACCESS_TOKEN'),
        'phone_number_id' => env('WHATSAPP_PHONE_NUMBER_ID'),
        'api_version' => env('WHATSAPP_API_VERSION', 'v20.0'),
        'base_url' => env('WHATSAPP_BASE_URL', 'https://graph.facebook.com'),
        'default_country_code' => env('WHATSAPP_DEFAULT_COUNTRY_CODE', '254'),
    ],
];
