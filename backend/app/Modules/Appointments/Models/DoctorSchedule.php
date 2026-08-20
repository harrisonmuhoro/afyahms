<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Models;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DoctorSchedule extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'branch_id',
        'doctor_id',
        'name',
        'slot_duration',
        'max_concurrent',
        'valid_from',
        'valid_until',
        'is_active',
    ];

    protected $casts = [
        'slot_duration' => 'integer',
        'max_concurrent' => 'integer',
        'valid_from' => 'date',
        'valid_until' => 'date',
        'is_active' => 'boolean',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function timeBlocks(): HasMany
    {
        return $this->hasMany(ScheduleTimeBlock::class, 'schedule_id');
    }

    public function overrides(): HasMany
    {
        return $this->hasMany(ScheduleOverride::class, 'schedule_id');
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class, 'schedule_id');
    }
}
