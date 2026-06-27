<?php

declare(strict_types=1);

namespace App\Modules\Patients\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class MergePatientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('patients.merge') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'source_uuid' => ['required', 'string', 'size:36'],
            'target_uuid' => ['required', 'string', 'size:36', 'different:source_uuid'],
            'reason'      => ['required', 'string', 'max:500'],
        ];
    }
}