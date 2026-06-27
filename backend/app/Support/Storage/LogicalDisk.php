<?php

declare(strict_types=1);

namespace App\Support\Storage;

use Illuminate\Contracts\Filesystem\Filesystem;

/**
 * Wrapper around a Laravel filesystem disk that knows the LOGICAL role
 * (clinical, reports, public_assets, branding) — visibility, signed-URL TTL,
 * and whether writes should be audited.
 */
final class LogicalDisk
{
    public function __construct(
        public readonly string $name,
        public readonly string $driver,
        private readonly Filesystem $filesystem,
        public readonly string $visibility,
        public readonly ?int $signedUrlTtlMinutes,
        public readonly bool $auditWrites,
    ) {}

    public function filesystem(): Filesystem
    {
        return $this->filesystem;
    }

    public function put(string $path, mixed $contents, array $options = []): bool
    {
        $options = array_merge(['visibility' => $this->visibility], $options);

        return $this->filesystem->put($path, $contents, $options);
    }

    public function exists(string $path): bool
    {
        return $this->filesystem->exists($path);
    }

    public function get(string $path): ?string
    {
        return $this->filesystem->get($path);
    }

    public function delete(string $path): bool
    {
        return $this->filesystem->delete($path);
    }

    public function size(string $path): int
    {
        return $this->filesystem->size($path);
    }

    /**
     * Time-limited signed URL — clinical files must NEVER be publicly readable.
     * Returns null if the underlying driver cannot sign.
     */
    public function temporaryUrl(string $path): ?string
    {
        $ttl = $this->signedUrlTtlMinutes ?? 15;

        try {
            if (method_exists($this->filesystem, 'temporaryUrl')) {
                return $this->filesystem->temporaryUrl($path, now()->addMinutes($ttl));
            }
        } catch (\Throwable) {
            // driver does not support signed URLs (e.g. local) — fall back to route-based signing
        }

        return url(\Illuminate\Support\Facades\URL::signedRoute('documents.signed', [
            'disk' => $this->name,
            'path' => $path,
            'expires' => now()->addMinutes($ttl)->getTimestamp(),
        ]));
    }
}