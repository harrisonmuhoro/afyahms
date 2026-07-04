<?php

declare(strict_types=1);

namespace App\Modules\Emr\Models;

use App\Modules\Tenancy\Scopes\BranchScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Central EMR aggregate — a clinical visit. SOAP notes + diagnoses hang off it.
 * Per docs/11-database-schema.md §6 and foundation §11 (≥10-year retention:
 * soft-delete only, never hard-delete clinical data).
 *
 * @property int    $id
 * @property string $public_id
 * @property int    $branch_id
 * @property int    $patient_id
 * @property int|null $visit_id
 * @property int|null $appointment_id
 * @property int|null $provider_id
 * @property string $encounter_type   outpatient|inpatient|emergency|teleconsult|procedure
 * @property string|null $department
 * @property \Illuminate\Support\Carbon $visit_date
 * @property string $status           open|in_progress|completed|cancelled
 * @property string $disposition      discharged|admitted|referred|deceased|followup|none
 * @property string|null $chief_complaint
 * @property \Illuminate\Support\Carbon|null $closed_at
 * @property int|null $created_by
 */
class Encounter extends Model
{
    use SoftDeletes;
    use \App\Modules\Patients\Traits\HasOwnPatientDataScope;

    protected $table = 'encounters';

    protected $fillable = [
        'public_id', 'branch_id', 'patient_id', 'visit_id', 'appointment_id', 'provider_id',
        'encounter_type', 'department', 'visit_date', 'status', 'disposition',
        'chief_complaint', 'closed_at', 'created_by',
    ];

    protected $casts = [
        'visit_date' => 'datetime',
        'closed_at'  => 'datetime',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new BranchScope());

        static::creating(function (self $encounter): void {
            if (empty($encounter->public_id)) {
                $encounter->public_id = (string) \Illuminate\Support\Str::uuid();
            }
            if (empty($encounter->visit_date)) {
                $encounter->visit_date = now();
            }
        });
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Patients\Models\Patient::class, 'patient_id');
    }

    public function visit(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Queue\Models\Visit::class, 'visit_id');
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'provider_id');
    }

    public function soapNote(): HasOne
    {
        return $this->hasOne(SoapNote::class, 'encounter_id')->latestOfMany();
    }

    public function soapNotes(): HasMany
    {
        return $this->hasMany(SoapNote::class, 'encounter_id');
    }

    public function diagnoses(): HasMany
    {
        return $this->hasMany(Diagnosis::class, 'encounter_id');
    }
}
