<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
use App\Modules\Auth\Models\UserMfa;
use App\Modules\Patients\Models\Patient;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Models\UserBranchAccess;
use App\Modules\Queue\Models\QueueStation;
use App\Modules\Messages\Models\Conversation;

/**
 * The single User model used by the entire application. Branch access and
 * roles are resolved through the relationship methods.
 *
 * Roles (Spatie) are NOT branch-scoped; branch access is via the pivot
 * `user_branch_access` (multi-branch supported, with a home branch).
 */
class User extends Authenticatable
{
    use HasApiTokens;
    use HasFactory;
    use HasRoles;
    use Notifiable;
    use SoftDeletes;

    protected $table = 'users';

    /** @var string */
    protected $guard_name = 'web';

    /** @var array<int, string> */
    protected $fillable = [
        'name', 'email', 'phone',
        'address', 'next_of_kin_name', 'next_of_kin_phone', 'profile_photo_path',
        'national_id', 'date_of_birth', 'staff_id', 'department', 'specialization',
        'license_number', 'employment_type', 'employment_start_date',
        'home_branch_id', 'current_branch_id', 'current_station_id',
        'locale', 'theme',
        'password',
        'mfa_enabled', 'mfa_confirmed_at', 'last_seen_at',
        'failed_login_attempts', 'locked_until',
        'is_active', 'deactivated_at', 'deactivated_reason', 'deactivated_by',
        'google_id', 'profile_complete',
    ];

    /** @var array<string, string> */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'email_verified_at'  => 'datetime',
        'password'           => 'hashed',
        'mfa_enabled'        => 'boolean',
        'mfa_confirmed_at'   => 'datetime',
        'last_seen_at'       => 'datetime',
        'locked_until'       => 'datetime',
        'failed_login_attempts' => 'integer',
        'is_active'          => 'boolean',
        'deactivated_at'     => 'datetime',
        'date_of_birth'      => 'date',
        'employment_start_date' => 'date',
        'national_id'        => 'encrypted',
    ];

    public function branches(): BelongsToMany
    {
        return $this->belongsToMany(Branch::class, 'user_branch_access')
            ->withPivot(['is_home', 'granted_at', 'granted_by']);
    }

    public function homeBranch()
    {
        return $this->belongsTo(Branch::class, 'home_branch_id');
    }

    public function currentBranch()
    {
        return $this->belongsTo(Branch::class, 'current_branch_id');
    }

    public function currentStation()
    {
        return $this->belongsTo(QueueStation::class, 'current_station_id');
    }

    public function patient()
    {
        return $this->hasOne(Patient::class, 'portal_user_id');
    }

    public function conversations(): BelongsToMany
    {
        return $this->belongsToMany(Conversation::class)->withPivot('last_read_at');
    }

    /**
     * Compatibility accessor for portal code that scopes records by patient ID.
     * The canonical relationship is patients.portal_user_id; users has no
     * patient_id database column.
     */
    public function getPatientIdAttribute(): ?int
    {
        if ($this->relationLoaded('patient')) {
            return $this->getRelation('patient')?->id;
        }

        return $this->patient()->value('id');
    }

    public function deactivatedBy()
    {
        return $this->belongsTo(self::class, 'deactivated_by');
    }

    public function mfa(): HasMany
    {
        return $this->hasMany(UserMfa::class);
    }

    public function activeMfa(): ?UserMfa
    {
        return $this->mfa()->whereNotNull('enabled_at')->latest('enabled_at')->first();
    }

    /**
     * Branch IDs this user is allowed to switch to. With branch.view-all
     * it returns all active branches (controller layer handles the join).
     */
    public function accessibleBranchIds(): array
    {
        if ($this->can('branch.view-all')) {
            return Branch::query()->where('is_active', true)->pluck('id')->all();
        }

        return $this->branches()->pluck('branches.id')->all();
    }

    public function isLocked(): bool
    {
        return $this->locked_until !== null && $this->locked_until->isFuture();
    }

    public function isDeactivated(): bool
    {
        return $this->is_active === false || $this->deactivated_at !== null;
    }

    public function doctorProfiles(): HasMany { return $this->hasMany(\App\Models\Profiles\DoctorProfile::class); }
    public function nurseProfiles(): HasMany { return $this->hasMany(\App\Models\Profiles\NurseProfile::class); }
    public function receptionistProfiles(): HasMany { return $this->hasMany(\App\Models\Profiles\ReceptionistProfile::class); }
    public function recordsOfficerProfiles(): HasMany { return $this->hasMany(\App\Models\Profiles\RecordsOfficerProfile::class); }
    public function pharmacistProfiles(): HasMany { return $this->hasMany(\App\Models\Profiles\PharmacistProfile::class); }
    public function labTechnicianProfiles(): HasMany { return $this->hasMany(\App\Models\Profiles\LabTechnicianProfile::class); }
    public function radiologistProfiles(): HasMany { return $this->hasMany(\App\Models\Profiles\RadiologistProfile::class); }
    public function cashierProfiles(): HasMany { return $this->hasMany(\App\Models\Profiles\CashierProfile::class); }

    protected static function booted(): void
    {
        static::creating(function (self $user): void {
            if (empty($user->public_id)) {
                $user->public_id = (string) Str::uuid();
            }
        });
    }
}
