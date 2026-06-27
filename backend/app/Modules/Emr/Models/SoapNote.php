<?php

declare(strict_types=1);

namespace App\Modules\Emr\Models;

use App\Modules\Tenancy\Scopes\BranchScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Subjective/Objective/Assessment/Plan note. Once signed (`signed_at` set), the
 * record is immutable — further changes are addenda (`is_amended`), per
 * docs/08-rbac-matrix.md (`emr.sign`, `emr.amend`) and foundation §11.
 *
 * @property int    $id
 * @property int    $branch_id
 * @property int    $encounter_id
 * @property int    $patient_id
 * @property string|null $subjective
 * @property string|null $objective
 * @property string|null $assessment
 * @property string|null $plan
 * @property int|null $authored_by
 * @property \Illuminate\Support\Carbon|null $signed_at
 * @property bool   $is_amended
 */
class SoapNote extends Model
{
    use SoftDeletes;

    protected $table = 'soap_notes';

    protected $fillable = [
        'branch_id', 'encounter_id', 'patient_id',
        'subjective', 'objective', 'assessment', 'plan',
        'authored_by', 'signed_at', 'is_amended',
    ];

    protected $casts = [
        'signed_at'  => 'datetime',
        'is_amended' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new BranchScope());
    }

    public function isSigned(): bool
    {
        return $this->signed_at !== null;
    }

    public function encounter(): BelongsTo
    {
        return $this->belongsTo(Encounter::class, 'encounter_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'authored_by');
    }
}
