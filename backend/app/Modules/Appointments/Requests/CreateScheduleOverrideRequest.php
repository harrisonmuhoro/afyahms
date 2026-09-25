<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CreateScheduleOverrideRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'override_date' => ['required', 'date'],
            'type' => ['required', 'in:unavailable,extra'],
            'start_time' => ['nullable', 'date_format:H:i:s', 'required_if:type,extra'],
            'end_time' => ['nullable', 'date_format:H:i:s', 'required_if:type,extra', 'after:start_time'],
            'reason' => ['nullable', 'string', 'max:255'],
        ];
    }
}
