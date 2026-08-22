<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * A patient never supplies the patient ID or booking channel. Both are
 * derived by the portal controller from the authenticated account.
 */
class StorePortalAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'doctor_id' => ['required', 'exists:users,id'],
            'branch_id' => ['required', 'exists:branches,id'],
            'schedule_id' => ['required', 'exists:doctor_schedules,id'],
            'type' => ['required', 'in:new_patient,follow_up,procedure,anc,immunization,lab_radiology,specialist_referral'],
            'appointment_date' => ['required', 'date', 'after_or_equal:today'],
            'start_time' => ['required', 'date_format:H:i:s'],
            'end_time' => ['required', 'date_format:H:i:s', 'after:start_time'],
            'reason' => ['nullable', 'string', 'max:255'],
            'chief_complaint' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
