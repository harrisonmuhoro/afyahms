<?php

declare(strict_types=1);

namespace App\Modules\Emr\Models;

use App\Modules\Tenancy\Scopes\BranchScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Per-encounter coded diagnosis (ICD-10). `icd10_code` + `description` are
 * denormalized snapshots taken at diagnosis time so the clinical record is
 * stable even if the catalog entry later changes (docs/11 §6).
 *
 * @property int    $id
 * @property int    $branch_id
 * @property int    $encounter_id
 * @property int    $patient_id
 * @property int|null $diagnosis_catalog_id
 * @property string $icd10_code
 * @property string|null $description
 * @property string $diagnosis_type   primary|secondary|provisional|differential
 * @property string $certainty        confirmed|suspected|ruled_out
 * @property \Illuminate\Support\Carbon|null $onset_date
 * @property int|null $diagnosed_by
 */
class Diagnosis extends Model
{
    use SoftDeletes;

    protected $table = 'diagnoses';

    protected $fillable = [
        'branch_id', 'encounter_id', 'patient_id', 'diagnosis_catalog_id',
        'icd10_code', 'description', 'diagnosis_type', 'certainty',
        'onset_date', 'diagnosed_by',
    ];

    protected $casts = [
        'onset_date' => 'date',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new BranchScope());
    }

    public function encounter(): BelongsTo
    {
        return $this->belongsTo(Encounter::class, 'encounter_id');
    }

    public function catalogEntry(): BelongsTo
    {
        return $this->belongsTo(DiagnosisCatalog::class, 'diagnosis_catalog_id');
    }

    public function diagnostician(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'diagnosed_by');
    }
}
