<?php

declare(strict_types=1);

return [
    'default' => env('FILESYSTEM_DISK', 'local'),

    'disks' => [
        'local' => [
            'driver' => 'local',
            'root'   => storage_path('app/private'),
            'serve'  => true,
            'throw'  => false,
        ],
        'public' => [
            'driver'     => 'local',
            'root'       => storage_path('app/public'),
            'url'        => env('APP_URL').'/storage',
            'visibility' => 'public',
            'throw'      => false,
        ],
        's3' => [
            'driver'                  => 's3',
            'key'                     => env('AWS_ACCESS_KEY_ID'),
            'secret'                  => env('AWS_SECRET_ACCESS_KEY'),
            'region'                  => env('AWS_DEFAULT_REGION'),
            'bucket'                  => env('AWS_BUCKET'),
            'url'                     => env('AWS_URL'),
            'endpoint'                => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw'                   => false,
        ],
        'r2' => [
            'driver'   => 's3',
            'key'      => env('CLOUDFLARE_R2_ACCESS_KEY_ID'),
            'secret'   => env('CLOUDFLARE_R2_SECRET_ACCESS_KEY'),
            'region'   => 'auto',
            'bucket'   => env('CLOUDFLARE_R2_BUCKET'),
            'endpoint' => env('CLOUDFLARE_R2_ENDPOINT'),
            'url'      => env('CLOUDFLARE_R2_PUBLIC_URL'),
            'throw'    => false,
        ],
        'b2' => [
            'driver'   => 's3',
            'key'      => env('BACKBLAZE_KEY_ID'),
            'secret'   => env('BACKBLAZE_APPLICATION_KEY'),
            'bucket'   => env('BACKBLAZE_BUCKET'),
            'endpoint' => env('BACKBLAZE_ENDPOINT'),
            'throw'    => false,
        ],
        'pdf' => [
            'driver'     => 'local',
            'root'       => storage_path('app/pdf-exports'),
            'url'        => env('APP_URL').'/storage/pdf-exports',
            'visibility' => 'public',
            'throw'      => false,
        ],
    ],

    'links' => [
        public_path('storage')             => storage_path('app/public'),
        public_path('storage/pdf-exports') => storage_path('app/pdf-exports'),
    ],
];