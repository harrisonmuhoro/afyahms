<?php

declare(strict_types=1);

namespace App\Modules\Patients\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property-read \App\Modules\Patients\Models\Allergy $resource
 */
final class AllergyResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->resource->id,
            'patient_uuid'   => $this->resource->patient?->public_id,
            'allergen'       => $this->resource->allergen,
            'allergen_type'  => $this->resource->allergen_type,
            'reaction'       => $this->resource->reaction,
            'severity'       => $this->resource->severity,
            'onset_date'     => $this->resource->onset_date?->toDateString(),
            'is_active'      => (bool) $this->resource->is_active,
            'recorded_by'    => $this->resource->recorded_by,
            'created_at'     => $this->resource->created_at?->toIso8601String(),
            'updated_at'     => $this->resource->updated_at?->toIso8601String(),
        ];
    }
}