<?php

declare(strict_types=1);

namespace App\Modules\Patients\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class StorePatientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('patients.create') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'first_name'       => ['required', 'string', 'max:80'],
            'middle_name'      => ['nullable', 'string', 'max:80'],
            'last_name'        => ['required', 'string', 'max:80'],
            'gender'           => ['required', 'in:male,female,other,unknown'],
            'marital_status'   => ['nullable', 'in:single,married,divorced,widowed,unknown'],
            'date_of_birth'    => ['required', 'date', 'before:today'],
            'phone'            => ['required', 'string', 'max:30', 'regex:/^(\+?254|0)?[7-9]\d{8}$/'],
            'national_id'      => ['nullable', 'string', 'min:6', 'max:9'],
            'sha_number'       => ['nullable', 'string', 'regex:/^(\d{9}|[A-Za-z0-9]{10,12})$/'],
            'email'            => ['nullable', 'email', 'max:191'],
            'blood_group'      => ['nullable', 'in:A+,A-,B+,B-,AB+,AB-,O+,O-,unknown'],
            'county'           => ['nullable', 'string', 'max:80'],
            'sub_county'       => ['nullable', 'string', 'max:80'],
            'address'          => ['nullable', 'string', 'max:255'],
            'occupation'       => ['nullable', 'string', 'max:120'],
            'is_active'        => ['sometimes', 'boolean'],
            'dedupe_override'  => ['sometimes', 'boolean'],
        ];
    }
}