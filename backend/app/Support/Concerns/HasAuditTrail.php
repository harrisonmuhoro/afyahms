<?php

declare(strict_types=1);

namespace App\Support\Concerns;

use App\Modules\Audit\Observers\AuditObserver;
use App\Modules\Audit\Services\AuditLogService;

/**
 * Wires Spatie ActivityLog + the custom immutable audit_logs writer
 * onto any model that uses this trait.
 *
 * Useful for domain models where:
 *   - Spatie ActivityLog captures the full diff (model changes)
 *   - AuditLogService captures security-relevant events (e.g. PHI access)
 */
trait HasAuditTrail
{
    public static function bootHasAuditTrail(): void
    {
        static::observe(AuditObserver::class);
    }
}