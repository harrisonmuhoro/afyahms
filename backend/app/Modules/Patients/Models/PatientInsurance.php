<?php

declare(strict_types=1);

namespace App\Modules\Patients\Models;

use App\Modules\Tenancy\Models\Branch;
use App\Support\Concerns\HasBranch;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Insurance cover attached to a patient. The `scheme_type` enum covers
 * SHA, private, corporate, and cash (the cash sentinel means "no cover"
 * and is rarely used — most cash patients simply have no rows here).
 *
 * @property int    $id
 * @property int    $patient_id
 * @property int    $branch_id
 * @property string $scheme_type
 * @property ?string $insurer_name
 * @property ?string $member_number
 * @property ?string $policy_number
 * @property ?string $principal_name
 * @property ?string $relationship
 * @property ?string $coverage_limit
 * @property ?\Illuminate\Support\Carbon $valid_from
 * @property ?\Illuminate\Support\Carbon $valid_to
 * @property bool   $is_primary
 * @property bool   $is_active
 */
class PatientInsurance extends Model
{
    use HasBranch;
    use HasFactory;
    use SoftDeletes;

    protected $table = 'patient_insurance';

    /** @var array<int, string> */
    protected $fillable = [
        'patient_id',
        'branch_id',
        'scheme_type',
        'insurer_name',
        'member_number',
        'policy_number',
        'principal_name',
        'relationship',
        'coverage_limit',
        'valid_from',
        'valid_to',
        'is_primary',
        'is_active',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'valid_from'    => 'date',
        'valid_to'      => 'date',
        'coverage_limit'=> 'decimal:2',
        'is_primary'    => 'boolean',
        'is_active'     => 'boolean',
    ];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function isCurrentlyValid(): bool
    {
        if (! $this->is_active) {
            return false;
        }

        $now = now()->startOfDay();
        if ($this->valid_from !== null && $this->valid_from->gt($now)) {
            return false;
        }
        if ($this->valid_to !== null && $this->valid_to->lt($now)) {
            return false;
        }

        return true;
    }
}