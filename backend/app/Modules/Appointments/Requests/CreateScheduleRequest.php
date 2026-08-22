<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'branch_id' => ['required', 'exists:branches,id'],
            'doctor_id' => ['required', 'exists:users,id'],
            'name' => ['required', 'string', 'max:100'],
            'slot_duration' => ['required', 'integer', 'min:5', 'max:120'],
            'max_concurrent' => ['required', 'integer', 'min:1'],
            'valid_from' => ['required', 'date', 'after_or_equal:today'],
            'valid_until' => ['nullable', 'date', 'after_or_equal:valid_from'],
            
            'time_blocks' => ['required', 'array', 'min:1'],
            'time_blocks.*.day_of_week' => ['required', 'integer', 'min:0', 'max:6'],
            'time_blocks.*.start_time' => ['required', 'date_format:H:i:s'],
            'time_blocks.*.end_time' => ['required', 'date_format:H:i:s', 'after:time_blocks.*.start_time'],
        ];
    }
}
