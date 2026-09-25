<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['sometimes', 'in:new_patient,follow_up,procedure,anc,immunization,lab_radiology,specialist_referral'],
            'reason' => ['nullable', 'string', 'max:255'],
            'chief_complaint' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
