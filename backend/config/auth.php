<?php

declare(strict_types=1);

return [
    'password' => [
        'min_length' => (int) env('AUTH_PASSWORD_MIN_LENGTH', 12),
    ],
    'defaults' => [
        'guard'     => env('AUTH_GUARD', 'web'),
        'passwords' => env('AUTH_PASSWORD_BROKER', 'users'),
    ],
    'guards' => [
        'web' => [
            'driver'   => 'session',
            'provider' => 'users',
        ],
        'sanctum' => [
            'driver'   => 'sanctum',
            'provider' => 'users',
        ],
    ],
    'providers' => [
        'users' => [
            'driver' => 'eloquent',
            'model'  => App\Models\User::class,
        ],
    ],
    'passwords' => [
        'users' => [
            'provider'     => 'users',
            'table'        => env('AUTH_PASSWORD_RESET_TOKEN_TABLE', 'password_reset_tokens'),
            'expire'       => 60,
            'throttle'     => 60,
        ],
    ],
    'password_timeout' => 10800,
];
