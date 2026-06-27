<?php

declare(strict_types=1);

return [
    'domain' => env('HORIZON_DOMAIN'),
    'path'   => env('HORIZON_PATH', 'horizon'),
    'use'    => 'default',
    'prefix' => env('HORIZON_PREFIX', 'afya_horizon:'),
    'middleware' => ['web'],
    'waits' => [
        'redis:default' => 60,
        'redis:realtime' => 5,
        'redis:alerts' => 5,
    ],
    'trim' => [
        'recent' => 60,
        'pending' => 60,
        'completed' => 60,
        'recent_failed' => 10080,
        'failed' => 10080,
        'monitored' => 10080,
    ],
    'silenced' => [],
    'metrics' => [
        'trim_snapshots' => [
            'job' => 24,
            'queue' => 24,
        ],
    ],
    'fast_termination' => false,
    'memory_limit' => 64,
    'defaults' => [
        'supervisor-default' => [
            'connection' => 'redis',
            'queue'      => ['default'],
            'balance'    => 'auto',
            'autoScaling' => [
                'enabled' => true,
                'max'      => env('HORIZON_MAX_PROCESSES', 10),
                'min'      => 1,
                'balanceMaxShift' => 1,
                'balanceCooldown' => 3,
            ],
            'maxProcesses' => env('HORIZON_MAX_PROCESSES', 10),
            'maxTime'      => 0,
            'maxJobs'      => 0,
            'memory'       => 128,
            'tries'        => 3,
            'timeout'      => 60,
            'nice'         => 0,
        ],
    ],
    'environments' => [
        'production' => [
            'supervisor-default' => [
                'maxProcesses' => env('HORIZON_MAX_PROCESSES', 10),
                'balanceMaxShift' => env('HORIZON_BALANCE_MAX_SHIFT', 1),
                'balanceCooldown' => env('HORIZON_BALANCE_COOLDOWN', 3),
            ],
        ],
        'local' => [
            'supervisor-default' => [
                'maxProcesses' => env('HORIZON_MAX_PROCESSES', 3),
            ],
        ],
    ],
];