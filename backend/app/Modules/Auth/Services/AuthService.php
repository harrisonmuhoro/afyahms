<?php

declare(strict_types=1);

namespace App\Modules\Auth\Services;

use App\Exceptions\Domain\ForbiddenException;
use App\Exceptions\Domain\ValidationFailedException;
use App\Models\User;
use App\Modules\Auth\Models\LoginHistory;
use App\Modules\Auth\Services\LoginHistoryService;
use App\Modules\Tenancy\Models\Branch;
use App\Services\OtpService;
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
        private readonly MfaService $mfa,
        private readonly LoginHistoryService $history,
        private readonly OtpService $otpService,
    ) {}

    /**
     * Attempt a password login.
     *
     * @return array{user: User, token: string, requires_mfa: bool}
     */
    public function login(string $email, string $password, Request $request): array
    {
        /** @var User|null $user */
        $user = User::query()->where('email', $email)->first();

        if ($user?->isDeactivated()) {
            $this->history->record($user, $request, LoginHistory::STATUS_LOCKED);

            throw new ForbiddenException(
                'This account has been deactivated. Contact your hospital administrator for help.',
                ['deactivated_at' => $user->deactivated_at?->toIso8601String()],
            );
        }

        if ($user !== null && $user->locked_until !== null && ! $user->isLocked()) {
            $this->history->clearFailures($user);
            $user->refresh();
        }

        if ($user?->isLocked()) {
            $this->history->record($user, $request, LoginHistory::STATUS_LOCKED);

            throw new ForbiddenException(
                $this->accountLockedMessage($user),
                ['locked_until' => $user->locked_until?->toIso8601String()],
            );
        }

        // Short-window throttle check.
        $recent = $this->history->recentAttemptsFor($email, 1);
        $maxAttempts = (int) config('auth.login.max_attempts_per_minute', 5);
        if ($recent >= $maxAttempts) {
            $this->history->record($user, $request, LoginHistory::STATUS_LOCKED);

            throw new ForbiddenException(
                'Too many sign-in attempts. Please wait 1 minute before trying again.',
                ['retry_after_seconds' => 60],
            );
        }

        if ($user === null) {
            $this->history->record($user, $request, LoginHistory::STATUS_FAILED_PASSWORD);
            // Unified error message to prevent user enumeration
            throw new ForbiddenException('Invalid email or password. Please try again.');
        }

        if (! Hash::check($password, $user->password)) {
            $locked = $this->history->recordFailedPassword(
                user: $user,
                maxAttempts: $maxAttempts,
                lockoutMinutes: (int) config('auth.login.lockout_minutes', 15),
                allowLockout: true,
            );
            $user->refresh();
            
            $this->history->record($user, $request, LoginHistory::STATUS_FAILED_PASSWORD);

            if ($locked ?? false) {
                throw new ForbiddenException(
                    $this->accountLockedMessage($user),
                    ['locked_until' => $user->locked_until?->toIso8601String()],
                );
            }

            // Unified error message to prevent user enumeration
            throw new ForbiddenException('Invalid email or password. Please try again.');
        }

        $this->history->clearFailures($user);

        $requiresMfaStep = $user->mfa_enabled && ! $this->bypassesLoginMfa($user);
        $mfaType = $requiresMfaStep ? $user->activeMfa()?->type : null;

        if ($requiresMfaStep && $mfaType === 'email') {
            $this->otpService->send($user, $user->email, 'mfa_login');
        }

        // Issue a "password-only" token (no MFA confirmed yet).
        // Routes protected by EnsureMfaConfirmed will reject until confirm.
        $tokenName = 'spa:'.now()->timestamp.':'.bin2hex(random_bytes(4));
        $token = $user->createToken($tokenName, $this->tokenAbilities($user));

        $this->history->record($user, $request, LoginHistory::STATUS_SUCCESS, mfaUsed: false);

        return [
            'user'                    => $user->load(['roles', 'branches']),
            'token'                   => $token->plainTextToken,
            'requires_mfa'            => $requiresMfaStep,
            'mfa_type'                => $requiresMfaStep ? $user->activeMfa()?->type : null,
            'requires_mfa_enrollment' => false,
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

    private function accountLockedMessage(User $user): string
    {
        $seconds = $user->locked_until === null
            ? 60
            : max(1, $user->locked_until->getTimestamp() - now()->getTimestamp());

        return sprintf(
            'Your account is temporarily locked because there were too many incorrect password attempts. Try again in %s.',
            $this->formatDuration($seconds),
        );
    }

    private function bypassesAccountLockout(?User $user): bool
    {
        // Security Fix: No account should bypass lockout, especially high-privileged ones.
        return false;
    }

    private function bypassesLoginMfa(User $user): bool
    {
        // Security Fix: Highly privileged accounts MUST use MFA. They should NEVER bypass it.
        return false;
    }

    private function formatDuration(int $seconds): string
    {
        if ($seconds >= 3600) {
            $hours = (int) ceil($seconds / 3600);

            return $hours.' '.str('hour')->plural($hours);
        }

        if ($seconds >= 60) {
            $minutes = (int) ceil($seconds / 60);

            return $minutes.' '.str('minute')->plural($minutes);
        }

        return $seconds.' '.str('second')->plural($seconds);
    }
}
