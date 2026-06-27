<?php

declare(strict_types=1);

namespace App\Support\Storage;

use App\Support\Storage\Contracts\StorageDriver;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;

/**
 * Driver-aware file operations facade.
 *
 * App code only ever calls:
 *   StorageManager::disk('clinical')->put(...)
 *   StorageManager::disk('clinical')->temporaryUrl(...)
 *   StorageManager::disk('reports')->exists(...)
 *
 * It never references S3/R2/B2/Local directly.
 */
final class StorageManager
{
    /** @var array<string, array<string, mixed>> */
    private const LOGICAL_DISKS = [
        'clinical'     => ['visibility' => 'private', 'audit' => true],
        'reports'      => ['visibility' => 'private', 'audit' => true],
        'public_assets'=> ['visibility' => 'public',  'audit' => false],
        'branding'     => ['visibility' => 'public',  'audit' => false],
    ];

    public function disk(string $name): LogicalDisk
    {
        if (! isset(self::LOGICAL_DISKS[$name])) {
            throw new InvalidArgumentException("Unknown logical disk [{$name}].");
        }

        $config = config("storage.disks.{$name}");
        if ($config === null) {
            throw new InvalidArgumentException("No storage config for [{$name}]. Add it to config/storage.php.");
        }

        $driverName = $config['driver'] ?? config('storage.default');
        $filesystem = Storage::disk($driverName);

        return new LogicalDisk(
            name: $name,
            driver: $driverName,
            filesystem: $filesystem,
            visibility: $config['visibility'] ?? self::LOGICAL_DISKS[$name]['visibility'],
            signedUrlTtlMinutes: $config['signed_url_ttl_minutes'] ?? null,
            auditWrites: (bool) ($config['audit_writes'] ?? self::LOGICAL_DISKS[$name]['audit']),
        );
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public function registeredDisks(): array
    {
        return self::LOGICAL_DISKS;
    }
}