<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CreateBranchHolidayRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'holiday_date' => ['required', 'date'],
            'name' => ['required', 'string', 'max:160'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
