<?php

declare(strict_types=1);

namespace App\Modules\Triage\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\Triage\Models\TriageAssessment
 */
final class TriageAssessmentResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'public_id'         => $this->public_id,
            'patient_id'        => $this->patient_id,
            'visit_id'          => $this->visit_id,
            'queue_ticket_id'   => $this->queue_ticket_id,
            'mts_level'         => $this->mts_level,
            'chief_complaint'   => $this->chief_complaint,
            'vitals' => [
                'temperature_c'    => $this->temperature_c,
                'pulse_bpm'        => $this->pulse_bpm,
                'respiratory_rate' => $this->respiratory_rate,
                'systolic_bp'      => $this->systolic_bp,
                'diastolic_bp'     => $this->diastolic_bp,
                'spo2_pct'         => $this->spo2_pct,
                'weight_kg'        => $this->weight_kg,
                'height_cm'        => $this->height_cm,
                'bmi'              => $this->bmi,
                'pain_score'       => $this->pain_score,
            ],
            'notes'        => $this->notes,
            'assessed_by'  => $this->assessed_by,
            'assessed_at'  => $this->assessed_at?->toIso8601String(),
        ];
    }
}
