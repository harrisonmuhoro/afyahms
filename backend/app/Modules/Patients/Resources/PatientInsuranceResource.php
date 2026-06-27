<?php

declare(strict_types=1);

namespace App\Modules\Patients\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property-read \App\Modules\Patients\Models\PatientInsurance $resource
 */
final class PatientInsuranceResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->resource->id,
            'patient_uuid'   => $this->resource->patient?->public_id,
            'scheme_type'    => $this->resource->scheme_type,
            'insurer_name'   => $this->resource->insurer_name,
            'member_number'  => $this->resource->member_number,
            'sha_id'         => $this->resource->scheme_type === 'sha' ? $this->resource->member_number : null,
            'policy_number'  => $this->resource->policy_number,
            'principal_name' => $this->resource->principal_name,
            'relationship'   => $this->resource->relationship,
            'coverage_limit' => $this->resource->coverage_limit,
            'valid_from'     => $this->resource->valid_from?->toDateString(),
            'valid_to'       => $this->resource->valid_to?->toDateString(),
            'is_primary'     => (bool) $this->resource->is_primary,
            'is_active'      => (bool) $this->resource->is_active,
            'is_valid'       => $this->resource->isCurrentlyValid(),
            'created_at'     => $this->resource->created_at?->toIso8601String(),
            'updated_at'     => $this->resource->updated_at?->toIso8601String(),
        ];
    }
}