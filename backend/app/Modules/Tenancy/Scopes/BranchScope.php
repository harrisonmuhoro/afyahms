<?php

declare(strict_types=1);

namespace App\Modules\Tenancy\Scopes;

use App\Modules\Tenancy\Services\BranchContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

/**
 * Global Eloquent scope that auto-filters branch-scoped queries by the
 * current request's active branch.
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

        $user = Auth::user();
        if ($user !== null && method_exists($user, 'hasRole') && $user->hasRole('superadmin')) {
            return;
        }

        $branchId = self::$activeBranchId ?? app(BranchContext::class)->get();
        if ($branchId === null) {
            $builder->whereRaw('1 = 0');

            return;
        }

        $builder->where($model->qualifyColumn('branch_id'), $branchId);
    }
}
