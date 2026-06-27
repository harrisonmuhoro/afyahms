<?php

declare(strict_types=1);

namespace App\Modules\Audit\Services;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Writes immutable audit entries to `audit_logs`.
 *
 * Foundation §11: Spatie Activity Log captures model diffs; this service
 * captures SECURITY-RELEVANT events (PHI access, payment state changes,
 * login attempts already in LoginHistory, role grants, etc).
 *
 * Entries are INSERT-only — there is no update or delete method exposed.
 */
final class AuditLogService
{
    public function record(
        string $event,
        ?User $actor,
        ?Request $request = null,
        ?Model $subject = null,
        /** @var array<string, mixed> */
        array $context = [],
    ): void {
        DB::table('audit_logs')->insert([
            'event'        => $event,
            'subject_type' => $subject ? get_class($subject) : ($context['subject_type'] ?? null),
            'subject_id'   => $subject?->getKey() ?? ($context['subject_id'] ?? null),
            'causer_type'  => $actor !== null ? User::class : null,
            'causer_id'    => $actor?->id,
            'properties'   => json_encode(array_merge($context, [
                'ip'      => $request?->ip(),
                'ua'      => substr((string) $request?->userAgent(), 0, 255),
                'route'   => $request?->route()?->getName(),
                'method'  => $request?->getMethod(),
            ]), JSON_UNESCAPED_UNICODE),
            'branch_id'    => app()->bound('active_branch_id') ? app('active_branch_id') : null,
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);
    }
}