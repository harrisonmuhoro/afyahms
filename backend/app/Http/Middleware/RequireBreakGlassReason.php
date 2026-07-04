<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Modules\Audit\Services\AuditLogService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class RequireBreakGlassReason
{
    public function __construct(private readonly AuditLogService $audit) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user?->hasRole('superadmin')) {
            $reason = trim((string) ($request->input('break_glass_reason') ?: $request->header('X-Break-Glass-Reason', '')));

            if ($reason === '') {
                return response()->json([
                    'error' => [
                        'type' => 'BreakGlassReasonRequired',
                        'status' => 403,
                        'message' => 'Superadmin clinical access requires a documented break-glass reason.',
                    ],
                ], 403);
            }

            $this->audit->record(
                event: 'clinical.break_glass.access',
                actor: $user,
                request: $request,
                context: [
                    'action' => 'break_glass_access',
                    'break_glass_reason' => $reason,
                    'route_name' => $request->route()?->getName(),
                    'path' => $request->path(),
                ],
            );
        }

        return $next($request);
    }
}
