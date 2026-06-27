<?php

declare(strict_types=1);

return [
    'name'            => env('REVERB_APP_NAME', 'afya-reverb'),
    'app_id'          => env('REVERB_APP_ID'),
    'key'             => env('REVERB_APP_KEY'),
    'secret'          => env('REVERB_APP_SECRET'),
    'host'            => env('REVERB_HOST', '0.0.0.0'),
    'port'            => env('REVERB_PORT', 8080),
    'hostname'        => env('REVERB_HOSTNAME'),
    'use_TLS'         => env('REVERB_SCHEME', 'http') === 'https',
    'ping_interval'   => env('REVERB_PING_INTERVAL', 60),
    'max_message_size'=> env('REVERB_MAX_MESSAGE_SIZE', 32_768),
    'scaling' => [
        'enabled'   => env('REVERB_SCALING_ENABLED', false),
        'channel'   => env('REVERB_SCALING_CHANNEL', 'redis'),
        'servers'   => [
            'host' => env('REDIS_HOST', '127.0.0.1'),
            'port' => env('REDIS_PORT', 6379),
        ],
    ],
    'apps' => [
        'provider' => env('REVERB_APP_PROVIDER', 'config'),
    ],
];