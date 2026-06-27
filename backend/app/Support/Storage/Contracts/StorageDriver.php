<?php

declare(strict_types=1);

namespace App\Support\Storage\Contracts;

interface StorageDriver
{
    public function put(string $path, mixed $contents): bool;

    public function get(string $path): ?string;

    public function exists(string $path): bool;

    public function delete(string $path): bool;

    public function temporaryUrl(string $path, int $ttlMinutes): ?string;
}