<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'patient_id' => ['required', 'exists:patients,id'],
            'doctor_id' => ['nullable', 'exists:users,id'],
            'branch_id' => ['required', 'exists:branches,id'],
            'appointment_date' => ['required', 'date', 'after:now'],
            'reason' => ['nullable', 'string', 'max:255'],
        ];
    }
}
