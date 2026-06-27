<?php

declare(strict_types=1);

namespace App\Modules\Queue\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\Queue\Models\QueueStation
 */
final class QueueStationResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'branch_id'      => $this->branch_id,
            'code'           => $this->code,
            'name'           => $this->name,
            'station_type'   => $this->station_type,
            'pipeline_order' => $this->pipeline_order,
            'is_active'      => (bool) $this->is_active,
            'status'         => $this->status,
        ];
    }
}
