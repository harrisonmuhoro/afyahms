<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Application Name
    |--------------------------------------------------------------------------
    */
    'name' => env('APP_NAME', 'Afya HMS'),

    /*
    |--------------------------------------------------------------------------
    | Hospital Identity (per foundation §1)
    |--------------------------------------------------------------------------
    | Branded values used in PDFs, mail, audit signatures, etc.
    */
    'hospital' => [
        'short_name'      => env('HOSPITAL_SHORT_NAME', 'Afya'),
        'legal_name'      => env('HOSPITAL_LEGAL_NAME', 'Afya Hospital Group Ltd.'),
        'address'         => env('HOSPITAL_ADDRESS', 'Nairobi, Kenya'),
        'phone'           => env('HOSPITAL_PHONE', '+254 700 000 000'),
        'email'           => env('HOSPITAL_EMAIL', 'info@afya.local'),
        'website'         => env('HOSPITAL_WEBSITE', 'https://afya.local'),
        'logo_path'       => env('HOSPITAL_LOGO_PATH', 'branding/logo.svg'),
        'primary_color'   => env('HOSPITAL_PRIMARY_COLOR', '#0F766E'),
        'secondary_color' => env('HOSPITAL_SECONDARY_COLOR', '#1E40AF'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Default currency, timezone, locale
    |--------------------------------------------------------------------------
    */
    'currency'         => env('APP_CURRENCY', 'KES'),
    'currency_symbol'  => env('APP_CURRENCY_SYMBOL', 'KSh'),
    'locale'           => env('APP_LOCALE', 'en'),
    'fallback_locale'  => env('APP_FALLBACK_LOCALE', 'en'),
    'available_locales'=> ['en', 'sw'],

    /*
    |--------------------------------------------------------------------------
    | Clinical Safety Defaults
    |--------------------------------------------------------------------------
    */
    'clinical' => [
        'retention_years'      => (int) env('CLINICAL_RETENTION_YEARS', 10),
        'soft_delete_only'     => true,
        'soap_note_immutable'  => true,
        'critical_vitals_flags' => [
            'systolic_bp_low'   => 90,
            'systolic_bp_high'  => 180,
            'diastolic_bp_low'  => 60,
            'diastolic_bp_high' => 120,
            'heart_rate_low'    => 40,
            'heart_rate_high'   => 130,
            'spo2_low'          => 92,
            'temp_high'         => 39.5,
            'temp_low'          => 35.0,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Queue Pipeline (canonical per foundation §13)
    |--------------------------------------------------------------------------
    */
    'queue_pipeline' => [
        'reception', 'triage', 'doctor', 'lab', 'pharmacy', 'billing',
    ],

    /*
    |--------------------------------------------------------------------------
    | Triage levels (Manchester Triage System)
    |--------------------------------------------------------------------------
    */
    'triage_levels' => [
        'red'    => ['label' => 'Red',    'sla_minutes' => 0,   'priority' => 1],
        'orange' => ['label' => 'Orange', 'sla_minutes' => 10,  'priority' => 2],
        'yellow' => ['label' => 'Yellow', 'sla_minutes' => 60,  'priority' => 3],
        'green'  => ['label' => 'Green',  'sla_minutes' => 120, 'priority' => 4],
        'blue'   => ['label' => 'Blue',   'sla_minutes' => 240, 'priority' => 5],
    ],

    /*
    |--------------------------------------------------------------------------
    | Feature flags
    |--------------------------------------------------------------------------
    */
    'features' => array_filter(array_map('trim', explode(',', (string) env('FEATURE_FLAGS', '')))),

    'debug' => (bool) env('APP_DEBUG', false),
    'url'   => env('APP_URL', 'http://localhost'),

    'timezone'    => env('APP_TIMEZONE', 'Africa/Nairobi'),
    'locale'      => env('APP_LOCALE', 'en'),
    'fallback_locale' => env('APP_FALLBACK_LOCALE', 'en'),
    'faker_locale'=> env('APP_FAKER_LOCALE', 'en_KE'),

    'cipher' => 'AES-256-CBC',

    'key' => env('APP_KEY'),
    'previous_keys' => array_filter(explode(',', (string) env('APP_PREVIOUS_KEYS', ''))),

    'maintenance' => [
        'driver' => env('APP_MAINTENANCE_DRIVER', 'file'),
        'store'  => env('APP_MAINTENANCE_STORE', 'database'),
    ],
];