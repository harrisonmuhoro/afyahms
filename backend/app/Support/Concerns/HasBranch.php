<?php

declare(strict_types=1);

namespace App\Support\Concerns;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Modules\Tenancy\Models\Branch;

/**
 * Adds the `branch()` belongsTo relation and auto-stamps branch_id on
 * save. Models that should NOT be branch-scoped (global reference data)
 * simply don't use this trait.
 *
 * Pairs with the global BranchScope to enforce row-level isolation.
 */
trait HasBranch
{
    public static function bootHasBranch(): void
    {
        static::creating(function ($model) {
            if ($model->branch_id === null && app()->bound('active_branch_id')) {
                $model->branch_id = app('active_branch_id');
            }
        });
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }
}