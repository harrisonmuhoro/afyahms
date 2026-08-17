<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReportFilterRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'from'      => ['nullable', 'date', 'date_format:Y-m-d'],
            'to'        => ['nullable', 'date', 'date_format:Y-m-d', 'after_or_equal:from'],
            'branch_id' => ['nullable', 'string'],
        ];
    }
}
