<?php

declare(strict_types=1);

return [
    'enabled' => env('SCOUT_ENABLED', true),
    'driver' => env('SCOUT_DRIVER', 'database'),
    'prefix' => env('SCOUT_PREFIX', ''),
    'queue' => env('SCOUT_QUEUE', true),
    'after_commit' => env('SCOUT_AFTER_COMMIT', true),
    'chunk' => env('SCOUT_CHUNK', 500),
    'soft_delete' => true,
    'identify' => env('SCOUT_IDENTIFY', true),
    'full_search' => env('SCOUT_FULL_SEARCH', false),
    'database' => [
        'collection' => 'searchable',
    ],
    'meilisearch' => [
        'host' => env('MEILISEARCH_HOST', 'http://localhost:7700'),
        'key'  => env('MEILISEARCH_KEY'),
    ],
];