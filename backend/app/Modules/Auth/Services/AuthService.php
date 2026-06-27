<?php

declare(strict_types=1);

namespace App\Modules\Auth\Services;

use App\Exceptions\Domain\ForbiddenException;
use App\Exceptions\Domain\ValidationFailedException;
use App\Models\User;
use App\Modules\Auth\Models\LoginHistory;
use App\Modules\Tenancy\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Login, logout, password change, token refresh.
 *
 * Sanctum is the authentication guard. Tokens are issued on successful
 * login and revoked on logout.
 */
final class AuthService
{
    public function __construct(
        private readonly LoginHistoryService $history,
        private readonly MfaService $mfa,
    ) {}

    /**
     * Attempt a password login.
     *
     * @return array{user: User, token: string, requires_mfa: bool}
     */
    public function login(string $email, string $password, Request $request): array
    {
        // Lockout check (early)
        $recent = $this->history->recentAttemptsFor($email, 1);
        $maxAttempts = (int) config('auth.login.max_attempts_per_minute', 5);
        if ($recent >= $maxAttempts) {
            $this->history->record(null, $request, LoginHistory::STATUS_LOCKED);

            throw new ForbiddenException(
                'Too many attempts. Please wait and try again.',
                ['retry_after_seconds' => 60],
            );
        }

        /** @var User|null $user */
        $user = User::query()->where('email', $email)->first();

        if ($user === null || ! Hash::check($password, $user->password)) {
            if ($user !== null) {
                $this->history->lockUser($user, (int) config('auth.login.lockout_minutes', 15));
            }
            $this->history->record($user, $request, LoginHistory::STATUS_FAILED_PASSWORD);

            throw new ForbiddenException('Invalid credentials.');
        }

        if ($user->isLocked()) {
            $this->history->record($user, $request, LoginHistory::STATUS_LOCKED);

            throw new ForbiddenException(
                'Account locked. Try again later.',
                ['locked_until' => $user->locked_until?->toIso8601String()],
            );
        }

        $this->history->clearFailures($user);

        $requiresMfa = $user->mfa_enabled;

        // Issue a "password-only" token (no MFA confirmed yet).
        // Routes protected by EnsureMfaConfirmed will reject until confirm.
        $tokenName = 'spa:'.now()->timestamp.':'.bin2hex(random_bytes(4));
        $token = $user->createToken($tokenName, $this->tokenAbilities($user));

        $this->history->record($user, $request, LoginHistory::STATUS_SUCCESS, mfaUsed: false);

        return [
            'user'         => $user->load(['roles', 'branches']),
            'token'        => $token->plainTextToken,
            'requires_mfa' => $requiresMfa,
        ];
    }

    /**
     * Confirm an MFA TOTP code for an already-authenticated session.
     */
    public function confirmMfa(User $user, string $code, bool $isRecovery, Request $request): bool
    {
        if (! $this->mfa->verify($user, $code, $isRecovery)) {
            $this->history->record($user, $request, LoginHistory::STATUS_FAILED_MFA);

            throw new ForbiddenException('Invalid MFA code.');
        }

        $this->mfa->markConfirmed($user);
        $this->history->record($user, $request, LoginHistory::STATUS_SUCCESS, mfaUsed: true);

        return true;
    }

    public function logout(User $user): void
    {
        $user->currentAccessToken()?->delete();
        $user->forceFill(['current_branch_id' => null])->saveQuietly();
    }

    /**
     * Switch the user's active branch. Verifies access.
     */
    public function switchBranch(User $user, int $branchId): User
    {
        if (! $user->can('branch.view-all') && ! in_array($branchId, $user->accessibleBranchIds(), true)) {
            throw new ForbiddenException('You do not have access to that branch.');
        }

        $branch = Branch::query()->where('id', $branchId)->where('is_active', true)->first();
        if ($branch === null) {
            throw new ValidationFailedException('Branch not found or inactive.');
        }

        // Stamp the active branch on the current token
        $token = $user->currentAccessToken();
        if ($token !== null) {
            DB::table('personal_access_tokens')
                ->where('id', $token->id)
                ->update(['active_branch_id' => $branchId]);
        }

        $user->forceFill(['current_branch_id' => $branchId])->saveQuietly();

        return $user;
    }

    /**
     * @return array<int, string>
     */
    public function tokenAbilities(User $user): array
    {
        $perms = $user->getAllPermissions()->pluck('name')->all();
        $perms[] = 'branch.switch';

        return array_values(array_unique($perms));
    }
}