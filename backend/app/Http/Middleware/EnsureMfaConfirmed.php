<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Blocks routes from running until users with MFA enabled have confirmed
 * a fresh TOTP step. MFA setup itself stays opt-in from account settings.
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

        if (! $user->mfa_enabled) {
            return $next($request);
        }

        if ($user->hasAnyRole(['superadmin', 'hospital-admin', 'doctor'])) {
            return $next($request);
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
