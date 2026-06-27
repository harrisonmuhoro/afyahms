<?php

declare(strict_types=1);

namespace App\Modules\Emr\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\Emr\Models\Encounter
 */
final class EncounterResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'public_id'       => $this->public_id,
            'patient_id'      => $this->patient_id,
            'visit_id'        => $this->visit_id,
            'provider_id'     => $this->provider_id,
            'encounter_type'  => $this->encounter_type,
            'department'      => $this->department,
            'visit_date'      => $this->visit_date?->toIso8601String(),
            'status'          => $this->status,
            'disposition'     => $this->disposition,
            'chief_complaint' => $this->chief_complaint,
            'closed_at'       => $this->closed_at?->toIso8601String(),
            'soap_note'       => $this->whenLoaded('soapNote', fn () => $this->soapNote ? new SoapNoteResource($this->soapNote) : null),
            'diagnoses'       => DiagnosisResource::collection($this->whenLoaded('diagnoses')),
            'created_at'      => $this->created_at?->toIso8601String(),
        ];
    }
}
