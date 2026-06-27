<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Blocks routes from running for users in MFA-required roles until they
 * have confirmed a fresh TOTP step.
 *
 * Per foundation §5/§11: `hospital-admin`, `doctor`, `pharmacist` must
 * complete MFA; a fresh login does not survive indefinitely.
 */
final class EnsureMfaConfirmed
{
    private const CONFIRM_WINDOW_SECONDS = 600; // 10 minutes

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null) {
            return $next($request);
        }

        $enforcedRoles = config('auth.mfa.enforced_for', []);
        $requiresMfa = $user->hasAnyRole($enforcedRoles);

        if (! $requiresMfa) {
            return $next($request);
        }

        if (! $user->mfa_enabled) {
            return response()->json([
                'error' => [
                    'type'    => 'MfaEnrollmentRequired',
                    'status'  => 403,
                    'message' => 'MFA enrollment is required for your role.',
                ],
            ], 403);
        }

        $lastConfirmed = $user->mfa_confirmed_at;
        $fresh = $lastConfirmed !== null
            && $lastConfirmed->diffInSeconds(now()) < self::CONFIRM_WINDOW_SECONDS;

        if (! $fresh) {
            return response()->json([
                'error' => [
                    'type'    => 'MfaStepRequired',
                    'status'  => 401,
                    'message' => 'A fresh MFA confirmation is required.',
                ],
            ], 401);
        }

        return $next($request);
    }
}