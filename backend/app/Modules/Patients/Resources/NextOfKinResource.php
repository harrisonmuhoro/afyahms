<?php

declare(strict_types=1);

namespace App\Modules\Patients\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property-read \App\Modules\Patients\Models\PatientNextOfKin $resource
 */
final class NextOfKinResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->resource->id,
            'patient_uuid'  => $this->resource->patient?->public_id,
            'full_name'     => $this->resource->full_name,
            'relationship'  => $this->resource->relationship,
            'phone'         => $this->resource->phone,
            'alt_phone'     => $this->resource->alt_phone,
            'email'         => $this->resource->email,
            'address'       => $this->resource->address,
            'is_primary'    => (bool) $this->resource->is_primary,
            'is_emergency'  => (bool) $this->resource->is_emergency,
            'created_at'    => $this->resource->created_at?->toIso8601String(),
            'updated_at'    => $this->resource->updated_at?->toIso8601String(),
        ];
    }
}