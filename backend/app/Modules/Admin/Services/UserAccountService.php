<?php

declare(strict_types=1);

namespace App\Modules\Admin\Services;

use App\Exceptions\Domain\ForbiddenException;
use App\Exceptions\Domain\ValidationFailedException;
use App\Models\User;
use App\Modules\Audit\Services\AuditLogService;
use App\Notifications\AccountReactivatedNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class UserAccountService
{
    public function __construct(private readonly AuditLogService $audit) {}

    public function assertCanView(User $actor, User $target): void
    {
        if ($target->hasRole('superadmin') && ! $actor->hasRole('superadmin')) {
            throw new ForbiddenException('Hospital Admin cannot view Superadmin accounts.');
        }
    }

    public function assertCanManage(User $actor, User $target): void
    {
        if ($target->hasRole('superadmin') && ! $actor->hasRole('superadmin')) {
            throw new ForbiddenException('Hospital Admin cannot manage Superadmin accounts.');
        }

        if ($target->hasRole('hospital-admin') && ! $actor->hasRole('superadmin')) {
            throw new ForbiddenException('Only Superadmin may manage Hospital Admin accounts.');
        }
    }

    public function assertAssignableRoles(User $actor, array $roles): void
    {
        if (in_array('superadmin', $roles, true) && ! $actor->hasRole('superadmin')) {
            throw new ForbiddenException('Only Superadmin may assign the Superadmin role.');
        }

        if (in_array('hospital-admin', $roles, true) && ! $actor->hasRole('superadmin')) {
            throw new ForbiddenException('Only Superadmin may create or promote Hospital Admin accounts.');
        }
    }

    public function assertCanChangeRoles(User $actor, User $target, array $roles): void
    {
        if ($actor->id === $target->id) {
            throw new ForbiddenException('You cannot change your own roles.');
        }

        $this->assertCanManage($actor, $target);
        $this->assertAssignableRoles($actor, $roles);

        if ($target->hasRole('superadmin') && ! in_array('superadmin', $roles, true)) {
            throw new ForbiddenException('A Superadmin account must retain the Superadmin role.');
        }
    }

    public function deactivate(User $actor, User $target, string $reason, ?Request $request = null): User
    {
        $reason = trim($reason);
        if ($reason === '') {
            throw new ValidationFailedException('Deactivation reason is required.');
        }

        if ($actor->id === $target->id) {
            throw new ForbiddenException('You cannot deactivate your own account.');
        }

        $this->assertCanManage($actor, $target);

        return DB::transaction(function () use ($actor, $target, $reason, $request): User {
            $target = User::query()->lockForUpdate()->findOrFail($target->id);

            if ($target->hasRole('superadmin') && $this->activeSuperadminCount() <= 1) {
                throw new ForbiddenException('At least one active Superadmin account must remain.');
            }

            $target->forceFill([
                'is_active' => false,
                'deactivated_at' => now(),
                'deactivated_reason' => $reason,
                'deactivated_by' => $actor->id,
                'current_branch_id' => null,
                'current_station_id' => null,
            ])->save();

            $target->tokens()->delete();
            DB::table('sessions')->where('user_id', $target->id)->delete();

            $this->audit->record(
                event: 'user.deactivated',
                actor: $actor,
                request: $request,
                subject: $target,
                context: [
                    'action' => 'deactivated',
                    'reason' => $reason,
                ],
            );

            return $target->fresh(['roles', 'branches']);
        });
    }

    public function reactivate(User $actor, User $target, string $reason, ?Request $request = null): User
    {
        $reason = trim($reason);
        if ($reason === '') {
            throw new ValidationFailedException('Reactivation reason is required.');
        }

        $this->assertCanManage($actor, $target);

        $updated = DB::transaction(function () use ($actor, $target, $reason, $request): User {
            $target = User::query()->lockForUpdate()->findOrFail($target->id);
            $reactivatedAt = now();
            $target->forceFill([
                'is_active' => true,
                'deactivated_at' => null,
                'deactivated_reason' => null,
                'deactivated_by' => null,
            ])->save();

            $this->audit->record(
                event: 'user.reactivated',
                actor: $actor,
                request: $request,
                subject: $target,
                context: [
                    'action' => 'reactivated',
                    'reason' => $reason,
                    'reactivated_at' => $reactivatedAt->toIso8601String(),
                ],
            );

            return $target->fresh(['roles', 'branches']);
        });

        $updated->notify(new AccountReactivatedNotification(
            actor: $actor,
            reason: $reason,
            reactivatedAt: now()->toIso8601String(),
        ));

        return $updated;
    }

    private function activeSuperadminCount(): int
    {
        return User::query()
            ->where('is_active', true)
            ->whereNull('deactivated_at')
            ->role('superadmin')
            ->count();
    }
}
