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
        $actorRole = $actor?->getRoleNames()->first();

        DB::table('audit_logs')->insert([
            'event'        => $event,
            'action'       => $context['action'] ?? $event,
            'subject_type' => $subject ? get_class($subject) : ($context['subject_type'] ?? null),
            'subject_id'   => $subject?->getKey() ?? ($context['subject_id'] ?? null),
            'field_name'   => $context['field_name'] ?? null,
            'old_value'    => $this->stringify($context['old_value'] ?? null),
            'new_value'    => $this->stringify($context['new_value'] ?? null),
            'causer_type'  => $actor !== null ? User::class : null,
            'causer_id'    => $actor?->id,
            'actor_role'   => $actorRole,
            'ip_address'   => $request?->ip(),
            'user_agent'   => substr((string) $request?->userAgent(), 0, 1024),
            'break_glass_reason' => $context['break_glass_reason'] ?? null,
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

    /**
     * @param array<string, mixed> $before
     * @param array<string, mixed> $after
     * @param array<string, mixed> $context
     */
    public function recordFieldChanges(
        string $event,
        ?User $actor,
        ?Request $request,
        Model $subject,
        array $before,
        array $after,
        array $context = [],
    ): void {
        foreach ($after as $field => $newValue) {
            $oldValue = $before[$field] ?? null;
            if ($oldValue == $newValue) {
                continue;
            }

            if (str_contains((string) $field, 'password')) {
                $oldValue = null;
                $newValue = null;
            }

            if (in_array($field, ['national_id', 'sha_number'], true)) {
                $oldValue = $this->maskSensitive($oldValue);
                $newValue = $this->maskSensitive($newValue);
            }

            $this->record(
                event: $event,
                actor: $actor,
                request: $request,
                subject: $subject,
                context: $context + [
                    'action' => 'updated',
                    'field_name' => $field,
                    'old_value' => $oldValue,
                    'new_value' => $newValue,
                ],
            );
        }
    }

    private function stringify(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        if (is_scalar($value)) {
            return (string) $value;
        }

        return json_encode($value, JSON_UNESCAPED_UNICODE);
    }

    private function maskSensitive(mixed $value): ?string
    {
        $value = (string) $value;
        if ($value === '') {
            return null;
        }

        return str_repeat('*', max(0, strlen($value) - 4)).substr($value, -4);
    }
}
