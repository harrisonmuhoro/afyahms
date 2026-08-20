<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Http\Resources\UserResource;
use App\Http\Resources\BranchResource;

class DoctorScheduleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slot_duration' => $this->slot_duration,
            'max_concurrent' => $this->max_concurrent,
            'valid_from' => $this->valid_from?->format('Y-m-d'),
            'valid_until' => $this->valid_until?->format('Y-m-d'),
            'is_active' => (bool) $this->is_active,
            'doctor' => new UserResource($this->whenLoaded('doctor')),
            'branch' => new BranchResource($this->whenLoaded('branch')),
            'time_blocks' => $this->whenLoaded('timeBlocks', function () {
                return $this->timeBlocks->map(fn ($block) => [
                    'id' => $block->id,
                    'day_of_week' => $block->day_of_week,
                    'start_time' => $block->start_time,
                    'end_time' => $block->end_time,
                ]);
            }),
            'overrides' => $this->whenLoaded('overrides', function () {
                return $this->overrides->map(fn ($override) => [
                    'id' => $override->id,
                    'override_date' => $override->override_date?->format('Y-m-d'),
                    'type' => $override->type,
                    'start_time' => $override->start_time,
                    'end_time' => $override->end_time,
                    'reason' => $override->reason,
                ]);
            }),
        ];
    }
}
