<?php

declare(strict_types=1);

namespace App\Modules\Patients\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class ReviewDataCorrectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('data-corrections.review') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in(['approved', 'rejected'])],
            'reason' => ['required', 'string', 'min:5', 'max:5000'],
        ];
    }
}
