<?php

declare(strict_types=1);

namespace App\Modules\Patients\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class StoreDataCorrectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('data-corrections.create') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'record_type' => ['required', 'string', 'max:191'],
            'record_id' => ['nullable', 'integer'],
            'field_name' => ['nullable', 'string', 'max:128'],
            'requested_value' => ['nullable', 'string', 'max:10000'],
            'reason' => ['required', 'string', 'min:10', 'max:5000'],
        ];
    }
}
