<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Resources\UserResource;
use App\Modules\Patients\Resources\PatientResource;
use App\Modules\Tenancy\Resources\BranchResource;

class AppointmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'patient_id' => $this->patient?->public_id,
            'appointment_number' => $this->appointment_number,
            'type' => $this->type,
            'status' => $this->status,
            'appointment_date' => $this->appointment_date?->format('Y-m-d'),
            'start_time' => $this->start_time,
            'end_time' => $this->end_time,
            'reason' => $this->reason,
            'chief_complaint' => $this->chief_complaint,
            'notes' => $this->notes,
            'booked_via' => $this->booked_via,
            'patient' => new PatientResource($this->whenLoaded('patient')),
            'doctor' => new UserResource($this->whenLoaded('doctor')),
            'branch' => new BranchResource($this->whenLoaded('branch')),
            'schedule' => new DoctorScheduleResource($this->whenLoaded('schedule')),
            'booked_by' => new UserResource($this->whenLoaded('bookedBy')),
            'cancelled_by' => new UserResource($this->whenLoaded('cancelledBy')),
            'cancellation_reason' => $this->cancellation_reason,
            'rescheduled_from' => $this->rescheduled_from,
            'encounter_id' => $this->encounter_id,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
