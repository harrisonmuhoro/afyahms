<?php

declare(strict_types=1);

namespace App\Support\Storage\Drivers;

use App\Support\Storage\Contracts\StorageDriver;
use Illuminate\Contracts\Filesystem\Filesystem;

final class LocalDriver implements StorageDriver
{
    public function __construct(private readonly Filesystem $filesystem) {}

    public function put(string $path, mixed $contents): bool
    {
        return $this->filesystem->put($path, $contents);
    }

    public function get(string $path): ?string
    {
        return $this->filesystem->get($path);
    }

    public function exists(string $path): bool
    {
        return $this->filesystem->exists($path);
    }

    public function delete(string $path): bool
    {
        return $this->filesystem->delete($path);
    }

    public function temporaryUrl(string $path, int $ttlMinutes): ?string
    {
        // Local filesystem cannot sign URLs; routed via Documents controller.
        return null;
    }
}