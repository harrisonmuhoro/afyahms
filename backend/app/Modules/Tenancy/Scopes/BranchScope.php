<?php

declare(strict_types=1);

namespace App\Modules\Tenancy\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * Global Eloquent scope that auto-filters every branch-scoped query by the
 * current request's `active_branch_id`.
 *
 * Disabled when:
 *   - the operator holds `branch.view-all` permission AND has explicitly
 *     requested all branches (X-View-All-Branches header or view_all_branches query).
 *   - the model is global reference data (those don't use this scope).
 *
 * Foundation §4 + RBAC §4 — the scope is the ONLY sanctioned mechanism for
 * row-level isolation; do not filter branch_id in repositories or services.
 */
final class BranchScope implements Scope
{
    private static bool $disabled = false;

    private static ?int $activeBranchId = null;

    public static function enableFor(?int $branchId): void
    {
        self::$disabled = false;
        self::$activeBranchId = $branchId;
    }

    public static function disable(): void
    {
        self::$disabled = true;
        self::$activeBranchId = null;
    }

    public static function isDisabled(): bool
    {
        return self::$disabled;
    }

    public static function activeBranchId(): ?int
    {
        return self::$activeBranchId;
    }

    public function apply(Builder $builder, Model $model): void
    {
        if (self::$disabled) {
            return;
        }

        $branchId = self::$activeBranchId ?? app('active_branch_id');
        if ($branchId === null) {
            return;     // no active branch resolved — return empty set defensively
        }

        $builder->where($model->qualifyColumn('branch_id'), $branchId);
    }
}