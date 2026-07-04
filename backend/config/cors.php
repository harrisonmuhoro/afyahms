<?php

declare(strict_types=1);

return [
    'default' => env('CORS_ALLOW_ORIGIN', '*'),
    'paths'   => ['api/*'],
    'allowed_methods'    => ['*'],
    'allowed_origins'    => explode(',', (string) env('CORS_ALLOWED_ORIGINS', '*')),
    'allowed_origins_patterns' => [],
    'allowed_headers'    => ['*'],
    'exposed_headers'    => ['X-Request-Id'],
    'max_age'    => 86400,
    // Must be false when allowed_origins contains '*'.
    // The app uses stateless Bearer tokens — no cookies needed.
    'supports_credentials' => false,
];