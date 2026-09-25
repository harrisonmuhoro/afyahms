<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Models;

use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Scopes\BranchScope;
use App\Modules\Patients\Models\Patient;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Appointment extends Model
{
    use HasFactory;
    use HasUuids;
    use SoftDeletes;

    protected $fillable = [
        'patient_id',
        'doctor_id',
        'branch_id',
        'schedule_id',
        'appointment_number',
        'type',
        'status',
        'appointment_date',
        'start_time',
        'end_time',
        'reason',
        'chief_complaint',
        'notes',
        'booked_by',
        'booked_via',
        'confirmed_at',
        'checked_in_at',
        'completed_at',
        'cancelled_at',
        'cancelled_by',
        'cancellation_reason',
        'consultation_start_time',
        'rescheduled_from',
        'encounter_id',
        'schedule_conflict',
        'schedule_conflict_reason',
        'schedule_conflict_at',
    ];

    protected $casts = [
        'appointment_date' => 'date',
        'start_time' => 'string',
        'end_time' => 'string',
        'status' => \App\Modules\Appointments\Enums\AppointmentStatus::class,
        'confirmed_at' => 'datetime',
        'checked_in_at' => 'datetime',
        'consultation_start_time' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'schedule_conflict' => 'boolean',
        'schedule_conflict_at' => 'datetime',
    ];

    public function uniqueIds(): array
    {
        return ['public_id'];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Model $model) {
            if (empty($model->public_id)) {
                $model->public_id = (string) Str::uuid();
            }
        });
    }

    protected static function booted(): void
    {
        static::addGlobalScope(new BranchScope());
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(DoctorSchedule::class, 'schedule_id');
    }

    public function bookedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'booked_by');
    }

    public function cancelledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    public function rescheduledFrom(): BelongsTo
    {
        return $this->belongsTo(self::class, 'rescheduled_from');
    }

    public function reminders(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(AppointmentReminder::class);
    }

    // Scopes
    public function scopeForBranch($query, $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    public function scopeForDoctor($query, $doctorId)
    {
        return $query->where('doctor_id', $doctorId);
    }

    public function scopeForPatient($query, $patientId)
    {
        return $query->where('patient_id', $patientId);
    }
}
