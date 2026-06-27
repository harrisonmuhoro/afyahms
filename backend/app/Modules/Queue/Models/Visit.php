<?php

declare(strict_types=1);

namespace App\Modules\Queue\Models;

use App\Modules\Tenancy\Scopes\BranchScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int    $id
 * @property string $public_id
 * @property int    $branch_id
 * @property int    $patient_id
 * @property int|null $appointment_id
 * @property int|null $encounter_id
 * @property string $visit_date         YYYY-MM-DD
 * @property string $visit_type         walk_in|appointment|referral|follow_up|emergency
 * @property string $status             open|in_progress|completed|cancelled
 * @property string|null $current_department   REC|TRI|DOC|LAB|PHA|BIL|RAD
 */
class Visit extends Model
{
    protected $table = 'visits';

    protected $fillable = [
        'public_id', 'branch_id', 'patient_id',
        'appointment_id', 'encounter_id',
        'visit_date', 'visit_type', 'status',
        'current_department', 'registered_by', 'registered_at', 'closed_at',
    ];

    protected $casts = [
        'visit_date'    => 'date',
        'registered_at'  => 'datetime',
        'closed_at'      => 'datetime',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new BranchScope());

        static::creating(function (self $visit): void {
            if (empty($visit->public_id)) {
                $visit->public_id = (string) \Illuminate\Support\Str::uuid();
            }
            if (empty($visit->registered_at)) {
                $visit->registered_at = now();
            }
        });
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Patients\Models\Patient::class, 'patient_id');
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(QueueTicket::class, 'visit_id');
    }

    public function triageAssessment(): HasMany
    {
        return $this->hasMany(\App\Modules\Triage\Models\TriageAssessment::class, 'visit_id');
    }
}
