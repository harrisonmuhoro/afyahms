<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:100'],
            'slot_duration' => ['sometimes', 'integer', 'min:5', 'max:120'],
            'max_concurrent' => ['sometimes', 'integer', 'min:1'],
            'valid_from' => ['sometimes', 'date', 'after_or_equal:today'],
            'valid_until' => ['nullable', 'date', 'after_or_equal:valid_from'],
            'is_active' => ['sometimes', 'boolean'],
            
            'time_blocks' => ['sometimes', 'array'],
            'time_blocks.*.day_of_week' => ['required_with:time_blocks', 'integer', 'min:0', 'max:6'],
            'time_blocks.*.start_time' => ['required_with:time_blocks', 'date_format:H:i:s'],
            'time_blocks.*.end_time' => ['required_with:time_blocks', 'date_format:H:i:s', 'after:time_blocks.*.start_time'],
        ];
    }
}
