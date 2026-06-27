<?php

declare(strict_types=1);

namespace App\Modules\Patients\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Patient-to-patient relationship (mother↔child, guardian↔dependant, spouse).
 *
 * Not branch-scoped: a guardian could be registered at a different branch
 * than the dependant they cover, so the link is global. Reads still go
 * through repository + service to keep the access pattern consistent.
 *
 * @property int    $id
 * @property int    $patient_id
 * @property int    $related_patient_id
 * @property string $relationship_type
 * @property bool   $is_guardian
 */
class PatientRelationship extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $table = 'patient_relationships';

    /** @var array<int, string> */
    protected $fillable = [
        'patient_id',
        'related_patient_id',
        'relationship_type',
        'is_guardian',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'is_guardian' => 'boolean',
    ];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function relatedPatient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'related_patient_id');
    }
}