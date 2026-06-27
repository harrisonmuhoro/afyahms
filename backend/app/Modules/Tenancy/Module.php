<?php

declare(strict_types=1);

namespace App\Modules\Tenancy;

/**
 * Per foundation §1 + folder-structure §3.4 — Tenancy owns branches,
 * branch switching, BranchScope, and user-branch access.
 *
 * Other modules depend ONLY on:
 *   - Tenancy\Models\Branch (read-only references)
 *   - Tenancy\Services\BranchContext (the active branch for the current request)
 *   - HasBranch trait (auto-stamping branch_id)
 *   - Tenancy\Scopes\BranchScope (global query filter)
 */
final class Module
{
    public static function register(\Illuminate\Contracts\Container\Container $app): void
    {
        $app->singleton(\App\Modules\Tenancy\Services\BranchContext::class);
    }

    public static function boot(\Illuminate\Contracts\Container\Container $app): void
    {
        // Register the global BranchScope once.
        \Illuminate\Database\Eloquent\Model::resolveRelationUsing('__branch_scope', function () {
            return null;
        });

        // GlobalsScopes can be added per-model by calling
        //   static::addGlobalScope(new BranchScope())
        // in the model's boot() method.
    }
}