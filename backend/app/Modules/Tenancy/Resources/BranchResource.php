<?php

declare(strict_types=1);

namespace App\Modules\Tenancy\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property-read \App\Modules\Tenancy\Models\Branch $resource
 */
final class BranchResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->resource->public_id ?? $this->resource->id,
            'code'             => $this->resource->code,
            'name'             => $this->resource->name,
            'address'          => $this->resource->address,
            'phone'            => $this->resource->phone,
            'email'            => $this->resource->email,
            'timezone'         => $this->resource->timezone,
            'currency'         => $this->resource->currency,
            'is_active'        => (bool) $this->resource->is_active,
            'mpesa_shortcode'  => $this->resource->mpesa_shortcode,
            'sha_facility_code'=> $this->resource->sha_facility_code,
            'created_at'       => $this->resource->created_at?->toIso8601String(),
            'updated_at'       => $this->resource->updated_at?->toIso8601String(),
        ];
    }
}