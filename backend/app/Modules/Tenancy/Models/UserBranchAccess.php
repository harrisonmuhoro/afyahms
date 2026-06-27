<?php

declare(strict_types=1);

namespace App\Modules\Tenancy\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Pivot: a user may belong to multiple branches. One row per (user, branch).
 *
 * - `is_home` indicates the user's default branch.
 * - `granted_at` + `granted_by` provide the audit trail of access grants.
 */
class UserBranchAccess extends Model
{
    protected $table = 'user_branch_access';

    /** @var array<int, string> */
    protected $fillable = [
        'user_id', 'branch_id', 'is_home', 'granted_at', 'granted_by',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'is_home'    => 'boolean',
        'granted_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }
}