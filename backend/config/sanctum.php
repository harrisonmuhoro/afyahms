<?php

declare(strict_types=1);

return [
    'stateful' => explode(',', (string) env('SANCTUM_STATEFUL_DOMAINS', 'localhost,127.0.0.1')),
    'guard'   => ['web'],
    'expiration' => null,
    'middleware' => [
        'verify_csrf_token' => \App\Http\Middleware\VerifyCsrfToken::class,
        'encrypt_cookies'   => \Illuminate\Cookie\Middleware\EncryptCookies::class,
    ],
];