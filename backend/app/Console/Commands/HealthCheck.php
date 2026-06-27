<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;

/**
 * Liveness probe target used by Docker / orchestrators.
 * Returns 0 (healthy) only if app boot succeeded.
 */
final class HealthCheck extends Command
{
    protected $signature = 'app:health-check';

    protected $description = 'Liveness probe — verifies DB and Redis are reachable.';

    public function handle(): int
    {
        try {
            \DB::connection()->getPdo();
            \Cache::store('redis')->getStore()->connection()->ping();

            $this->components->info('OK — DB + Redis reachable.');

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->components->error('UNHEALTHY — '.$e->getMessage());

            return self::FAILURE;
        }
    }
}