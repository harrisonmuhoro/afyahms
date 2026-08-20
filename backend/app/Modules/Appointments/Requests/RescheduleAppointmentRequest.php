<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RescheduleAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorize handled in Controller via Policy
    }

    public function rules(): array
    {
        return [
            'doctor_id' => ['nullable', 'exists:users,id'],
            'schedule_id' => ['required', 'exists:doctor_schedules,id'],
            'appointment_date' => ['required', 'date', 'after_or_equal:today'],
            'start_time' => ['required', 'date_format:H:i:s'],
            'end_time' => ['required', 'date_format:H:i:s', 'after:start_time'],
        ];
    }
}
