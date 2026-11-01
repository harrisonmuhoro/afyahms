<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Modules\Admin\Rbac;
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

        $required = $user->hasAnyRole(Rbac::MFA_REQUIRED);
        if (! $required && ! $user->mfa_enabled) {
            return $next($request);
        }

        $lastConfirmed = $user->mfa_confirmed_at;
        $fresh = $user->mfa_enabled
            && $user->activeMfa() !== null
            && $lastConfirmed !== null
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
