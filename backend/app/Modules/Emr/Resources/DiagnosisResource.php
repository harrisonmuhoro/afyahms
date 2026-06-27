<?php

declare(strict_types=1);

namespace App\Modules\Emr\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\Emr\Models\Diagnosis
 */
final class DiagnosisResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'encounter_id'   => $this->encounter_id,
            'patient_id'     => $this->patient_id,
            'icd10_code'     => $this->icd10_code,
            'description'    => $this->description,
            'diagnosis_type' => $this->diagnosis_type,
            'certainty'      => $this->certainty,
            'onset_date'     => $this->onset_date?->toDateString(),
            'diagnosed_by'   => $this->diagnosed_by,
            'created_at'     => $this->created_at?->toIso8601String(),
        ];
    }
}
