<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Modules\Auth\Services\LoginHistoryService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Enforces an idle session timeout for the Sanctum token. If the user has
 * not made a request within the configured window, the current request is
 * rejected and the token is revoked.
 */
final class IdleSessionTimeout
{
    public function __construct(private readonly LoginHistoryService $loginHistory) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null) {
            return $next($request);
        }

        $timeout = (int) config('auth.session.idle_timeout_seconds', 1800);
        $lastSeen = $user->last_seen_at;
        $idle = $lastSeen === null
            || $lastSeen->diffInSeconds(now()) > $timeout;

        if ($idle) {
            // Revoke current token (best effort)
            $token = $user->currentAccessToken();
            if ($token !== null) {
                $token->delete();
            }

            return response()->json([
                'error' => [
                    'type'    => 'IdleSessionTimeout',
                    'status'  => 401,
                    'message' => 'Session expired due to inactivity.',
                ],
            ], 401);
        }

        // Fire-and-forget heartbeat
        $this->loginHistory->heartbeat($user);

        return $next($request);
    }
}