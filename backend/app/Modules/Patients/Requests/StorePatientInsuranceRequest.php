<?php

declare(strict_types=1);

namespace App\Modules\Patients\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class StorePatientInsuranceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('patients.update') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'scheme_type'     => ['required', 'in:sha,private,corporate,cash'],
            'insurer_name'    => ['required_if:scheme_type,private,corporate', 'nullable', 'string', 'max:150'],
            'member_number'   => ['required', 'string', 'max:80'],
            'sha_id'          => ['required_if:scheme_type,sha', 'nullable', 'string', 'max:40'],
            'policy_number'   => ['nullable', 'string', 'max:80'],
            'principal_name'  => ['nullable', 'string', 'max:160'],
            'relationship'    => ['nullable', 'string', 'max:60'],
            'coverage_limit'  => ['nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'valid_from'      => ['required', 'date'],
            'valid_to'        => ['nullable', 'date', 'after:valid_from'],
            'is_primary'      => ['sometimes', 'boolean'],
            'is_active'       => ['sometimes', 'boolean'],
        ];
    }
}