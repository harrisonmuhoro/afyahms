<?php

declare(strict_types=1);

namespace App\Modules\Queue\Models;

use App\Modules\Tenancy\Scopes\BranchScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int    $id
 * @property int    $branch_id
 * @property string $code           REC|TRI|DOC|LAB|PHA|BIL|RAD
 * @property string $name
 * @property string $station_type
 * @property int    $pipeline_order
 * @property bool   $is_active
 * @property string $status         open|serving|paused|closed
 */
class QueueStation extends Model
{
    protected $table = 'queue_stations';

    protected $fillable = [
        'branch_id',
        'code',
        'name',
        'station_type',
        'pipeline_order',
        'is_active',
        'status',
        'assigned_user_id',
    ];

    protected $casts = [
        'is_active'      => 'boolean',
        'pipeline_order' => 'integer',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new BranchScope());
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(QueueTicket::class, 'station_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Tenancy\Models\Branch::class, 'branch_id');
    }
}
