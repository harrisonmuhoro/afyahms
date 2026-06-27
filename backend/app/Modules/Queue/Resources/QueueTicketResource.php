<?php

declare(strict_types=1);

namespace App\Modules\Queue\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\Queue\Models\QueueTicket
 */
final class QueueTicketResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'public_id'       => $this->public_id,
            'branch_id'       => $this->branch_id,
            'visit_id'        => $this->visit_id,
            'station_id'      => $this->station_id,
            'station_code'    => $this->station?->code,
            'station_name'    => $this->station?->name,
            'patient_id'      => $this->patient_id,
            'patient_name'    => trim(($this->patient?->first_name ?? '').' '.($this->patient?->last_name ?? '')) ?: null,
            'patient_number'  => $this->patient?->patient_number,
            'ticket_number'   => $this->ticket_number,
            'sequence_value'  => $this->sequence_value,
            'ticket_date'     => $this->ticket_date?->toDateString(),
            'priority'        => $this->priority,
            'mts_category'    => $this->mts_category,
            'state'           => $this->state,
            'served_by'       => $this->served_by,
            'called_at'       => $this->called_at?->toIso8601String(),
            'served_at'       => $this->served_at?->toIso8601String(),
            'completed_at'    => $this->completed_at?->toIso8601String(),
        ];
    }
}
