<?php

declare(strict_types=1);

use App\Http\Middleware\ForceJsonResponse;
use App\Http\Middleware\IdleSessionTimeout;
use App\Http\Middleware\LogPhiAccess;
use App\Http\Middleware\SecureHeaders;
use App\Http\Middleware\SetActiveBranch;
use App\Http\Middleware\EnforceBranchScope;
use App\Http\Middleware\EnsureMfaConfirmed;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
        apiPrefix: 'api',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            ForceJsonResponse::class,
            SecureHeaders::class,
        ]);

        $middleware->api(append: [
            SetActiveBranch::class,
            EnforceBranchScope::class,
        ]);

        $middleware->statefulApi();

        $middleware->alias([
            'auth.sanctum' => \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
            'active.branch' => SetActiveBranch::class,
            'branch.scope' => EnforceBranchScope::class,
            'mfa.confirmed' => EnsureMfaConfirmed::class,
            'idle.timeout' => IdleSessionTimeout::class,
            'phi.log' => LogPhiAccess::class,
            'force.json' => ForceJsonResponse::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
        ]);

        $middleware->throttleApi('120,1');   // default; tightened per route
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(function ($request) {
            return $request->is('api/*') || $request->expectsJson();
        });

        // RFC7807-ish JSON shape
        $exceptions->render(function (\Throwable $e, $request) {
            if (! ($request->is('api/*') || $request->expectsJson())) {
                return null;
            }

            $status = match (true) {
                $e instanceof \Illuminate\Validation\ValidationException => 422,
                $e instanceof \Illuminate\Auth\AuthenticationException => 401,
                $e instanceof \Illuminate\Auth\Access\AuthorizationException => 403,
                // CSRF mismatch: the framework converts TokenMismatchException -> HttpException(419)
                // before this closure runs; map it explicitly so it isn't reported as 500.
                $e instanceof \Illuminate\Session\TokenMismatchException => 419,
                $e instanceof \App\Exceptions\Domain\DomainException => $e->getStatusCode(),
                // Any abort()/HttpException carries its own status (covers 404/405/419/429/etc.).
                // Keep last so the specific cases above win, then honour the declared status.
                $e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface => $e->getStatusCode(),
                default => 500,
            };

            return response()->json([
                'error' => [
                    'type'    => class_basename($e),
                    'status'  => $status,
                    'message' => $e->getMessage() ?: 'An error occurred.',
                    'details' => $e instanceof \Illuminate\Validation\ValidationException
                        ? $e->errors()
                        : null,
                ],
            ], $status);
        });
    })
    ->create();