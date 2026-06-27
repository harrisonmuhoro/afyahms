<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Clinical alerts (foundation — ClinicalAlerts module)
    |--------------------------------------------------------------------------
    */

    'drug_interaction' => [
        'enabled' => env('ALERTS_DRUG_INTERACTION_ENABLED', true),
        'severities' => ['low', 'moderate', 'high', 'contraindicated'],
        'block_on' => ['contraindicated', 'high'],
    ],

    'allergy' => [
        'enabled' => env('ALERTS_ALLERGY_ENABLED', true),
        'block_on' => ['confirmed'],     // cross-reactivity with documented allergy
    ],

    'critical_results' => [
        'enabled' => env('ALERTS_CRITICAL_ENABLED', true),
        'broadcast' => true,
    ],

    /*
    | OpenFDA reference cache TTL. The drug-interaction engine pulls label
    | data from OpenFDA on cache miss.
    */
    'openfda_cache_ttl' => 86400,
    'openfda_base_url' => 'https://api.fda.gov',
];