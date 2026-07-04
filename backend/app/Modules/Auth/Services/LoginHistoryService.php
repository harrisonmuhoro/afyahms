<?php

declare(strict_types=1);

namespace App\Modules\Auth\Services;

use App\Models\User;
use App\Modules\Auth\Models\LoginHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Records and inspects login attempts.
 *
 * Foundation §11: "device + IP tracking, login history".
 */
final class LoginHistoryService
{
    public function record(
        ?User $user,
        Request $request,
        string $status,
        bool $mfaUsed = false,
    ): LoginHistory {
        return LoginHistory::create([
            'user_id'      => $user?->id,
            'ip_address'   => $request->ip(),
            'user_agent'   => substr((string) $request->userAgent(), 0, 1024),
            'device_id'    => $this->fingerprint($request),
            'status'       => $status,
            'mfa_used'     => $mfaUsed,
            'attempted_at' => now(),
        ]);
    }

    public function heartbeat(User $user): void
    {
        $user->forceFill(['last_seen_at' => now()])->saveQuietly();
    }

    public function fingerprint(Request $request): string
    {
        $ua = (string) $request->userAgent();
        $accept = (string) $request->header('Accept-Language');

        return hash('sha256', $ua.'|'.$accept.'|'.$request->ip());
    }

    public function recentAttemptsFor(?string $email, int $minutes = 1): int
    {
        return LoginHistory::query()
            ->where('attempted_at', '>=', now()->subMinutes($minutes))
            ->when($email, fn ($q) => $q->whereIn('user_id', User::query()->where('email', $email)->pluck('id')))
            ->where('status', '!=', LoginHistory::STATUS_SUCCESS)
            ->count();
    }

    public function lockUser(User $user, int $minutes = 15): void
    {
        $user->forceFill([
            'locked_until' => now()->addMinutes($minutes),
            'failed_login_attempts' => $user->failed_login_attempts + 1,
        ])->saveQuietly();
    }

    public function recordFailedPassword(User $user, int $maxAttempts, int $lockoutMinutes = 15, bool $allowLockout = true): bool
    {
        $attempts = $user->failed_login_attempts + 1;
        $locked = $allowLockout && $attempts >= $maxAttempts;

        $user->forceFill([
            'failed_login_attempts' => $attempts,
            'locked_until' => $locked ? now()->addMinutes($lockoutMinutes) : null,
        ])->saveQuietly();

        return $locked;
    }

    public function clearFailures(User $user): void
    {
        $user->forceFill([
            'failed_login_attempts' => 0,
            'locked_until'          => null,
        ])->saveQuietly();
    }
}
