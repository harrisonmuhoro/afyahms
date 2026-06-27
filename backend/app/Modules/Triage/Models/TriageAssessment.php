<?php

declare(strict_types=1);

namespace App\Modules\Triage\Models;

use App\Modules\Tenancy\Scopes\BranchScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int    $id
 * @property string $public_id
 * @property int    $branch_id
 * @property int    $patient_id
 * @property int    $visit_id
 * @property int|null $queue_ticket_id
 * @property string $mts_level          red|orange|yellow|green|blue
 * @property string|null $chief_complaint
 * @property float|null $temperature_c
 * @property int|null $pulse_bpm
 * @property int|null $respiratory_rate
 * @property int|null $systolic_bp
 * @property int|null $diastolic_bp
 * @property int|null $spo2_pct
 * @property float|null $weight_kg
 * @property float|null $height_cm
 * @property float|null $bmi
 * @property int|null $pain_score
 * @property string|null $notes
 * @property int    $assessed_by
 * @property \Illuminate\Support\Carbon $assessed_at
 */
class TriageAssessment extends Model
{
    protected $table = 'triage_assessments';

    protected $fillable = [
        'public_id', 'branch_id', 'patient_id', 'visit_id', 'queue_ticket_id',
        'mts_level', 'chief_complaint',
        'temperature_c', 'pulse_bpm', 'respiratory_rate',
        'systolic_bp', 'diastolic_bp', 'spo2_pct',
        'weight_kg', 'height_cm', 'bmi', 'pain_score',
        'notes', 'assessed_by', 'assessed_at',
    ];

    protected $casts = [
        'temperature_c' => 'decimal:1',
        'weight_kg'     => 'decimal:2',
        'height_cm'     => 'decimal:2',
        'bmi'           => 'decimal:2',
        'assessed_at'   => 'datetime',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new BranchScope());

        static::creating(function (self $assessment): void {
            if (empty($assessment->public_id)) {
                $assessment->public_id = (string) \Illuminate\Support\Str::uuid();
            }
            if (empty($assessment->assessed_at)) {
                $assessment->assessed_at = now();
            }

            // Auto-compute BMI if weight + height provided.
            if ($assessment->weight_kg !== null
                && $assessment->height_cm !== null
                && $assessment->bmi === null) {
                $m = ((float) $assessment->height_cm) / 100.0;
                if ($m > 0) {
                    $assessment->bmi = round(((float) $assessment->weight_kg) / ($m * $m), 2);
                }
            }
        });
    }

    public function visit(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Queue\Models\Visit::class, 'visit_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Patients\Models\Patient::class, 'patient_id');
    }

    public function assessor(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'assessed_by');
    }
}
