<?php

declare(strict_types=1);

namespace App\Modules\PatientPortal\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateOwnDemographicsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('portal.demographics.update') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'current_password' => ['sometimes', 'nullable', 'string'],
            'first_name' => ['sometimes', 'string', 'max:80'],
            'middle_name' => ['nullable', 'string', 'max:80'],
            'last_name' => ['sometimes', 'string', 'max:80'],
            'gender' => ['sometimes', 'in:male,female,other,unknown'],
            'marital_status' => ['sometimes', 'in:single,married,divorced,widowed,unknown'],
            'date_of_birth' => ['sometimes', 'nullable', 'date'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'national_id' => ['sometimes', 'nullable', 'string', 'max:50'],
            'guardian_name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'guardian_national_id' => ['sometimes', 'nullable', 'string', 'max:50'],
            'guardian_relationship' => ['sometimes', 'nullable', 'string', 'max:50'],
            'sha_number' => ['sometimes', 'nullable', 'string'],
            'email' => ['sometimes', 'nullable', 'email', 'max:191'],
            'blood_group' => ['sometimes', 'in:A+,A-,B+,B-,AB+,AB-,O+,O-,unknown'],
            'county' => ['sometimes', 'nullable', 'string', 'max:80'],
            'sub_county' => ['sometimes', 'nullable', 'string', 'max:80'],
            'address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'occupation' => ['sometimes', 'nullable', 'string', 'max:120'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [];
    }
}
