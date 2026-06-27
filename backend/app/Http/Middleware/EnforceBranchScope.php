<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Modules\Tenancy\Scopes\BranchScope;
use App\Modules\Tenancy\Services\BranchContext;
use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ensures the BranchScope global scope is registered for the request lifecycle.
 *
 * The scope is bypassable by users holding `branch.view-all`; in that case we
 * do NOT register the scope and instead record that the user explicitly
 * opted out (for audit). This makes "view-all" an explicit, logged action
 * rather than a silent one.
 */
final class EnforceBranchScope
{
    public function __construct(private readonly BranchContext $context) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null) {
            return $next($request);
        }

        // Operators with `branch.view-all` may opt-in via explicit header/query
        $wantsAll = $request->boolean('view_all_branches')
            || $request->header('X-View-All-Branches') === 'true';

        if ($wantsAll && $user->can('branch.view-all')) {
            BranchScope::disable();
            $request->attributes->set('branch_scope_disabled', true);
        } else {
            BranchScope::enableFor($this->context->get());
        }

        return $next($request);
    }
}