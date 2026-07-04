<?php

declare(strict_types=1);

namespace App\Modules\Patients\Models;

use App\Models\User;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Scopes\BranchScope;
use App\Support\Concerns\HasBranch;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Patient allergy record. Fed into the ClinicalAlerts interaction engine
 * (Foundation §11; design in docs/18-clinical-alerts-design.md) — drug
 * allergies specifically will block prescriptions at dispensing time.
 *
 * @property int    $id
 * @property int    $patient_id
 * @property int    $branch_id
 * @property string $allergen
 * @property string $allergen_type
 * @property ?string $reaction
 * @property string $severity
 * @property ?\Illuminate\Support\Carbon $onset_date
 * @property ?int   $recorded_by
 * @property bool   $is_active
 */
class Allergy extends Model
{
    use HasBranch;
    use HasFactory;
    use SoftDeletes;
    use \App\Modules\Patients\Traits\HasOwnPatientDataScope;

    protected $table = 'allergies';

    /** @var array<int, string> */
    protected $fillable = [
        'patient_id',
        'branch_id',
        'allergen',
        'allergen_type',
        'reaction',
        'severity',
        'onset_date',
        'recorded_by',
        'is_active',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'onset_date' => 'date',
        'is_active'  => 'boolean',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new BranchScope());
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
