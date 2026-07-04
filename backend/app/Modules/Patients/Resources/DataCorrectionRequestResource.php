<?php

declare(strict_types=1);

namespace App\Modules\Patients\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class DataCorrectionRequestResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $row = $this->resource;

        return [
            'id' => $row->public_id,
            'patient_id' => $row->patient?->public_id,
            'patient_name' => $row->patient?->fullName(),
            'requested_by' => $row->requester?->name,
            'record_type' => $row->record_type,
            'record_id' => $row->record_id,
            'field_name' => $row->field_name,
            'requested_value' => $row->requested_value,
            'reason' => $row->reason,
            'status' => $row->status,
            'reviewed_by' => $row->reviewer?->name,
            'review_reason' => $row->review_reason,
            'reviewed_at' => $row->reviewed_at?->toIso8601String(),
            'created_at' => $row->created_at?->toIso8601String(),
        ];
    }
}
