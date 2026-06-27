<?php

declare(strict_types=1);

use Laravel\Sanctum\Sanctum;

return [
    /*
    |--------------------------------------------------------------------------
    | Storage driver abstraction (foundation §7)
    |--------------------------------------------------------------------------
    | App code NEVER references a concrete provider; it uses
    |   app(StorageManager::class)->disk('clinical')->put(...)
    | or DocumentService. This file is the single source of driver selection.
    */

    'default' => env('STORAGE_DEFAULT_DRIVER', env('FILESYSTEM_DISK', 'local')),

    /*
    | Logical disks app code talks to. Each maps to a Laravel filesystem
    | disk configured in config/filesystems.php plus policy flags.
    */
    'disks' => [
        'clinical' => [
            'driver' => env('STORAGE_CLINICAL_DISK', 's3'),
            'visibility' => 'private',                  // never public
            'signed_url_ttl_minutes' => (int) env('STORAGE_SIGNED_URL_TTL', 15),
            'encrypt_at_rest' => true,
            'audit_writes' => true,
        ],
        'public_assets' => [
            'driver' => 'public',
            'visibility' => 'public',
            'signed_url_ttl_minutes' => null,
            'audit_writes' => false,
        ],
        'reports' => [
            'driver' => env('STORAGE_REPORTS_DISK', 'local'),
            'visibility' => 'private',
            'signed_url_ttl_minutes' => 60,
            'audit_writes' => true,
        ],
        'branding' => [
            'driver' => 'public',
            'visibility' => 'public',
            'signed_url_ttl_minutes' => null,
            'audit_writes' => false,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Per-driver configuration (passed through to FilesystemManager)
    |--------------------------------------------------------------------------
    */
    'drivers' => [
        'local' => [
            'root' => storage_path('app/private'),
        ],
        's3' => [
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION', 'eu-central-1'),
            'bucket' => env('AWS_BUCKET'),
            'endpoint' => env('AWS_ENDPOINT'),
            'url' => env('AWS_URL'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'server_side_encryption' => 'AES256',
        ],
        'r2' => [
            'key' => env('CLOUDFLARE_R2_ACCESS_KEY_ID'),
            'secret' => env('CLOUDFLARE_R2_SECRET_ACCESS_KEY'),
            'region' => 'auto',
            'bucket' => env('CLOUDFLARE_R2_BUCKET'),
            'endpoint' => env('CLOUDFLARE_R2_ENDPOINT'),
            'url' => env('CLOUDFLARE_R2_PUBLIC_URL'),
        ],
        'b2' => [
            'key' => env('BACKBLAZE_KEY_ID'),
            'secret' => env('BACKBLAZE_APPLICATION_KEY'),
            'bucket' => env('BACKBLAZE_BUCKET'),
            'endpoint' => env('BACKBLAZE_ENDPOINT'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | File-type policies
    |--------------------------------------------------------------------------
    | Enforced at DocumentService level. PDFs, JPEG/PNG, DICOM allowed.
    | Anything else is rejected unless whitelisted.
    */
    'allowed_mime' => [
        'application/pdf',
        'image/jpeg', 'image/png', 'image/webp', 'image/svg+xml',
        'application/dicom',
        'text/plain', 'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
    ],

    'max_upload_mb' => (int) env('STORAGE_MAX_UPLOAD_MB', 20),
];