<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SlotResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // For simple arrays returned from SlotGeneratorService
        return [
            'start_time' => $this['start_time'],
            'end_time' => $this['end_time'],
            'status' => $this['status'],
        ];
    }
}
