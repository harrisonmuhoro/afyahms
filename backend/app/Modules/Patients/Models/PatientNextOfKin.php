<?php

declare(strict_types=1);

namespace App\Modules\Patients\Models;

use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Scopes\BranchScope;
use App\Support\Concerns\HasBranch;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Next-of-kin contact for a patient.
 *
 * Free-text relationship rather than a fixed enum — the API spec defines
 * the closed set but the data model allows future types (e.g. "cousin").
 *
 * @property int    $id
 * @property int    $patient_id
 * @property int    $branch_id
 * @property string $full_name
 * @property string $relationship
 * @property ?string $phone
 * @property ?string $alt_phone
 * @property ?string $email
 * @property ?string $address
 * @property bool   $is_primary
 * @property bool   $is_emergency
 */
class PatientNextOfKin extends Model
{
    use HasBranch;
    use HasFactory;
    use SoftDeletes;
    use \App\Modules\Patients\Traits\HasOwnPatientDataScope;

    protected $table = 'patient_next_of_kin';

    /** @var array<int, string> */
    protected $fillable = [
        'patient_id',
        'branch_id',
        'full_name',
        'relationship',
        'phone',
        'alt_phone',
        'email',
        'address',
        'is_primary',
        'is_emergency',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'is_primary'   => 'boolean',
        'is_emergency' => 'boolean',
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
}
