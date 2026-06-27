<?php

declare(strict_types=1);

namespace App\Modules\Patients\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdatePatientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('patients.update') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'first_name'       => ['sometimes', 'string', 'max:80'],
            'middle_name'      => ['nullable', 'string', 'max:80'],
            'last_name'        => ['sometimes', 'string', 'max:80'],
            'gender'           => ['sometimes', 'in:male,female,other,unknown'],
            'marital_status'   => ['sometimes', 'in:single,married,divorced,widowed,unknown'],
            'date_of_birth'    => ['sometimes', 'date', 'before:today'],
            'phone'            => ['sometimes', 'string', 'max:30', 'regex:/^(\+?254|0)?[7-9]\d{8}$/'],
            'national_id'      => ['sometimes', 'nullable', 'string', 'max:40'],
            'sha_number'       => ['sometimes', 'nullable', 'string', 'max:40'],
            'email'            => ['sometimes', 'nullable', 'email', 'max:191'],
            'blood_group'      => ['sometimes', 'in:A+,A-,B+,B-,AB+,AB-,O+,O-,unknown'],
            'county'           => ['sometimes', 'nullable', 'string', 'max:80'],
            'sub_county'       => ['sometimes', 'nullable', 'string', 'max:80'],
            'address'          => ['sometimes', 'nullable', 'string', 'max:255'],
            'occupation'       => ['sometimes', 'nullable', 'string', 'max:120'],
            'is_active'        => ['sometimes', 'boolean'],
        ];
    }
}