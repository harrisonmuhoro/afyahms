<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class TriggerAppointmentReminderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', 'in:confirmation,24h,2h,cancellation,reschedule'],
        ];
    }
}
