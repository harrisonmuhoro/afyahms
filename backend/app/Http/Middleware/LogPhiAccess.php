<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Modules\Audit\Services\AuditLogService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Logs an immutable audit entry when a PHI-read route is accessed.
 *
 * Usage:  ->middleware(['auth:sanctum', 'phi.log'])
 * Records actor, route, params, ip, ua, and the response status. Failures
 * here MUST NOT fail the request; PHI access audit is best-effort but always
 * persisted if possible.
 */
final class LogPhiAccess
{
    public function __construct(private readonly AuditLogService $audit) {}

    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        $user = $request->user();

        try {
            $this->audit->record(
                event: 'phi.access',
                actor: $user,
                request: $request,
                context: [
                    'route'   => $request->route()?->getName(),
                    'method'  => $request->getMethod(),
                    'status'  => $response->getStatusCode(),
                    'params'  => $request->route()?->parameters(),
                ],
            );
        } catch (\Throwable) {
            // swallow — audit must not break user-facing flows
        }

        return $response;
    }
}