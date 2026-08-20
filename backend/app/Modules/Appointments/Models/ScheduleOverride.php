<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduleOverride extends Model
{
    use HasFactory;
    use HasUuids;

    const UPDATED_AT = null;

    protected $fillable = [
        'schedule_id',
        'override_date',
        'type',
        'start_time',
        'end_time',
        'reason',
        'created_by',
    ];

    protected $casts = [
        'override_date' => 'date',
        'start_time' => 'string',
        'end_time' => 'string',
    ];

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(DoctorSchedule::class, 'schedule_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
