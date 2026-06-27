<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | SHA — Social Health Authority (Kenya national insurer)
    |--------------------------------------------------------------------------
    | Foundation §9 mandates an InsurerGateway abstraction. SHA is one driver;
    | future insurers plug in here without touching feature code.
    */

    'default' => env('SHA_DEFAULT_GATEWAY', 'sha'),

    'gateways' => [
        'sha' => [
            'env'           => env('SHA_ENV', 'sandbox'),
            'base_url'      => env('SHA_BASE_URL'),
            'client_id'     => env('SHA_CLIENT_ID'),
            'client_secret' => env('SHA_CLIENT_SECRET'),
            'facility_code' => env('SHA_FACILITY_CODE'),
            'timeout'       => 30,
            'retry' => [
                'times' => 5,
                'backoff_seconds' => [30, 60, 120, 300, 600],
            ],
        ],
    ],

    /*
    | Claim line items must include ICD-10 and SHA tariff codes. Tariff
    | catalog is global reference data (not branch-scoped).
    */
    'tariff_cache_ttl' => 3600,
    'eligibility_cache_ttl' => 300,
];