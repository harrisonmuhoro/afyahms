<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Modules\Tenancy\Services\BranchContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the user's active branch from the Sanctum token's `active_branch_id`
 * claim (set when the user uses the branch switcher) and exposes it via the
 * BranchContext request-scoped holder.
 *
 * Must run AFTER auth.sanctum so the user is resolved.
 */
final class SetActiveBranch
{
    public function __construct(private readonly BranchContext $context) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user !== null) {
            $activeBranchId = $this->resolveActiveBranchId($user, $request);
            $this->context->set($activeBranchId);
            $request->attributes->set('active_branch_id', $activeBranchId);
        }

        return $next($request);
    }

    private function resolveActiveBranchId($user, Request $request): ?int
    {
        // 1) Sanctum token claim overrides everything (per-branch session)
        if ($request->user('sanctum')?->currentAccessToken()?->active_branch_id !== null) {
            return (int) $request->user('sanctum')->currentAccessToken()->active_branch_id;
        }

        // 2) User's current_branch_id
        if (isset($user->current_branch_id) && $user->current_branch_id !== null) {
            return (int) $user->current_branch_id;
        }

        // 3) Home branch
        if (isset($user->home_branch_id) && $user->home_branch_id !== null) {
            return (int) $user->home_branch_id;
        }

        return null;
    }
}