<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Models;

use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Scopes\BranchScope;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class BranchPublicHoliday extends Model
{
    protected $table = 'branch_public_holidays';

    protected $fillable = ['branch_id', 'holiday_date', 'name', 'is_active', 'created_by'];

    protected $casts = [
        'holiday_date' => 'date',
        'is_active' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new BranchScope());
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
