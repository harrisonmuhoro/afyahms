<?php

declare(strict_types=1);

namespace App\Modules\Patients\Models;

use App\Models\User;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Scopes\BranchScope;
use App\Support\Concerns\HasAuditTrail;
use App\Support\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * Root clinical aggregate. Every downstream module depends on this row
 * (and its `public_id` UUID for external references).
 *
 * Per Foundation §3, `patient_number` follows `PAT-YYYY-NNNNNN`, allocated
 * by `SequenceService` (gap-tolerant under `SELECT ... FOR UPDATE`).
 *
 * PHI: `national_id` is stored with Laravel's `encrypted` cast (column is
 *   still indexed — encrypted values are deterministic only if a key is
 *   supplied; we therefore index the encrypted ciphertext and rely on the
 *   service layer's dedupe matcher for fuzzy lookups).
 *
 * @property int $id
 * @property string $public_id
 * @property string $patient_number
 * @property int $branch_id
 * @property string $first_name
 * @property ?string $middle_name
 * @property string $last_name
 * @property ?string $national_id
 * @property ?string $sha_number
 * @property ?Carbon $date_of_birth
 * @property string $gender
 * @property string $marital_status
 * @property string $blood_group
 * @property ?string $phone
 * @property ?string $email
 * @property ?string $county
 * @property ?string $sub_county
 * @property ?string $address
 * @property ?string $occupation
 * @property ?string $photo_path
 * @property bool $deceased
 * @property ?Carbon $deceased_at
 * @property ?int $portal_user_id
 * @property bool $is_active
 * @property ?int $registered_by
 * @property ?string $merged_into_public_id
 * @property ?Carbon $merged_at
 */
class Patient extends Model
{
    use HasAuditTrail;
    use HasFactory;
    use HasPublicId;
    use LogsActivity;
    use Notifiable;
    use SoftDeletes;

    protected $table = 'patients';

    /** @var array<int, string> */
    protected $fillable = [
        'public_id',
        'patient_number',
        'branch_id',
        'first_name',
        'middle_name',
        'last_name',
        'national_id',
        'guardian_name',
        'guardian_national_id',
        'guardian_relationship',
        'sha_number',
        'date_of_birth',
        'gender',
        'marital_status',
        'blood_group',
        'phone',
        'email',
        'county',
        'sub_county',
        'address',
        'occupation',
        'photo_path',
        'deceased',
        'deceased_at',
        'portal_user_id',
        'is_active',
        'registered_by',
        'merged_into_public_id',
        'merged_at',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'date_of_birth' => 'date',
        'deceased_at' => 'date',
        'merged_at' => 'datetime',
        'national_id' => 'encrypted',
        'guardian_national_id' => 'encrypted',
        'sha_number' => 'encrypted',
        'deceased' => 'boolean',
        'is_active' => 'boolean',
    ];

    /** @var array<int, string> */
    protected $hidden = [];

    protected static function booted(): void
    {
        // BranchScope removed: Patients are global
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'first_name', 'middle_name', 'last_name',
                'phone', 'email', 'address', 'county',
                'date_of_birth', 'gender', 'blood_group',
                'is_active', 'deceased',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function registeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registered_by');
    }

    public function nextOfKin(): HasMany
    {
        return $this->hasMany(PatientNextOfKin::class);
    }

    public function primaryNextOfKin(): HasOne
    {
        return $this->hasOne(PatientNextOfKin::class)->where('is_primary', true);
    }

    public function insurance(): HasMany
    {
        return $this->hasMany(PatientInsurance::class);
    }

    public function primaryInsurance(): HasOne
    {
        return $this->hasOne(PatientInsurance::class)->where('is_primary', true);
    }

    public function allergies(): HasMany
    {
        return $this->hasMany(Allergy::class);
    }

    public function activeAllergies(): HasMany
    {
        return $this->allergies()->where('is_active', true);
    }

    public function relationships(): HasMany
    {
        return $this->hasMany(PatientRelationship::class, 'patient_id');
    }

    public function fullName(): string
    {
        return trim(collect([$this->first_name, $this->middle_name, $this->last_name])->filter()->implode(' '));
    }

    public function ageYears(): ?int
    {
        return $this->date_of_birth?->age;
    }

    public function isMerged(): bool
    {
        return $this->merged_at !== null && $this->merged_into_public_id !== null;
    }

    public function getNoShowCountAttribute(): int
    {
        return \App\Modules\Appointments\Models\Appointment::withoutGlobalScopes()
            ->where('patient_id', $this->id)
            ->where('status', 'no_show')
            ->count();
    }
}
