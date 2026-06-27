<?php

declare(strict_types=1);

namespace App\Modules\Patients\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdatePatientInsuranceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('patients.update') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'scheme_type'     => ['sometimes', 'in:sha,private,corporate,cash'],
            'insurer_name'    => ['sometimes', 'nullable', 'string', 'max:150'],
            'member_number'   => ['sometimes', 'string', 'max:80'],
            'sha_id'          => ['sometimes', 'nullable', 'string', 'max:40'],
            'policy_number'   => ['sometimes', 'nullable', 'string', 'max:80'],
            'principal_name'  => ['sometimes', 'nullable', 'string', 'max:160'],
            'relationship'    => ['sometimes', 'nullable', 'string', 'max:60'],
            'coverage_limit'  => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'valid_from'      => ['sometimes', 'date'],
            'valid_to'        => ['sometimes', 'nullable', 'date', 'after:valid_from'],
            'is_primary'      => ['sometimes', 'boolean'],
            'is_active'       => ['sometimes', 'boolean'],
        ];
    }
}