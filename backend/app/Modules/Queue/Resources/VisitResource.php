<?php

declare(strict_types=1);

namespace App\Modules\Queue\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\Queue\Models\Visit
 */
final class VisitResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id'                 => $this->id,
            'public_id'          => $this->public_id,
            'branch_id'          => $this->branch_id,
            'patient_id'         => $this->patient_id,
            'patient_name'       => trim(($this->patient?->first_name ?? '').' '.($this->patient?->last_name ?? '')) ?: null,
            'patient_number'     => $this->patient?->patient_number,
            'visit_date'         => $this->visit_date?->toDateString(),
            'visit_type'         => $this->visit_type,
            'status'             => $this->status,
            'current_department' => $this->current_department,
            'registered_at'      => $this->registered_at?->toIso8601String(),
            'closed_at'          => $this->closed_at?->toIso8601String(),
            'tickets'            => QueueTicketResource::collection($this->whenLoaded('tickets')),
        ];
    }
}
