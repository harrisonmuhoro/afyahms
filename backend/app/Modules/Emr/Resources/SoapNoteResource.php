<?php

declare(strict_types=1);

namespace App\Modules\Emr\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\Emr\Models\SoapNote
 */
final class SoapNoteResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'encounter_id' => $this->encounter_id,
            'patient_id'   => $this->patient_id,
            'subjective'   => $this->subjective,
            'objective'    => $this->objective,
            'assessment'   => $this->assessment,
            'plan'         => $this->plan,
            'authored_by'  => $this->authored_by,
            'is_signed'    => $this->signed_at !== null,
            'is_amended'   => (bool) $this->is_amended,
            'signed_at'    => $this->signed_at?->toIso8601String(),
            'created_at'   => $this->created_at?->toIso8601String(),
            'updated_at'   => $this->updated_at?->toIso8601String(),
        ];
    }
}
