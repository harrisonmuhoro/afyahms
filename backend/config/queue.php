<?php

declare(strict_types=1);

return [
    'default' => env('QUEUE_CONNECTION', 'redis'),

    'connections' => [
        'sync' => [
            'driver' => 'sync',
        ],
        'database' => [
            'driver'      => 'database',
            'connection'  => env('DB_QUEUE_CONNECTION'),
            'table'       => env('DB_QUEUE_TABLE', 'jobs'),
            'queue'       => env('DB_QUEUE', 'default'),
            'retry_after' => (int) env('DB_QUEUE_RETRY_AFTER', 90),
            'after_commit'=> false,
        ],
        'redis' => [
            'driver'      => 'redis',
            'connection'  => env('REDIS_QUEUE_CONNECTION', 'default'),
            'queue'       => env('REDIS_QUEUE', 'default'),
            'retry_after' => (int) env('REDIS_QUEUE_RETRY_AFTER', 90),
            'block_for'   => null,
            'after_commit'=> false,
        ],
    ],

    'batching' => [
        'database' => env('DB_CONNECTION', 'mysql'),
        'table'    => 'job_batches',
    ],

    'failed' => [
        'driver'   => env('QUEUE_FAILED_DRIVER', 'database-uuids'),
        'database' => env('DB_CONNECTION', 'mysql'),
        'table'    => 'failed_jobs',
    ],

    /*
    |--------------------------------------------------------------------------
    | Department Grace Windows (seconds) — docs/28-canonical-decisions §15
    |--------------------------------------------------------------------------
    |
    | Grace period before a ticket is flagged overdue after being called.
    | Values: REC 3 min, TRI 5 min, DOC 5 min, RAD 5 min,
    |         LAB 3 min, PHA 3 min, BIL 3 min.
    |
    */
    'grace_windows' => [
        'REC' => 180,
        'TRI' => 300,
        'DOC' => 300,
        'RAD' => 300,
        'LAB' => 180,
        'PHA' => 180,
        'BIL' => 180,
    ],
];