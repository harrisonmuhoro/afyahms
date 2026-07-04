<?php

declare(strict_types=1);

namespace App\Modules\Staff\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateStaffBasicProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('profile.self.update.basic') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $blocked = ['prohibited'];

        return [
            'current_password' => ['required', 'string'],
            'name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:32', 'regex:/^(\+?254|0)?[7-9]\d{8}$/'],
            'address' => ['sometimes', 'nullable', 'string', 'max:500'],
            'next_of_kin_name' => ['sometimes', 'nullable', 'string', 'max:200'],
            'next_of_kin_phone' => ['sometimes', 'nullable', 'string', 'max:32', 'regex:/^(\+?254|0)?[7-9]\d{8}$/'],
            'locale' => ['sometimes', 'in:en,sw'],

            'role' => $blocked,
            'roles' => $blocked,
            'department' => $blocked,
            'department_id' => $blocked,
            'staff_id' => $blocked,
            'employee_number' => $blocked,
            'license_number' => $blocked,
            'specialization' => $blocked,
            'account_status' => $blocked,
            'is_active' => $blocked,
            'national_id' => $blocked,
            'date_of_birth' => $blocked,
            'email' => $blocked,
            'password' => $blocked,
            'salary' => $blocked,
            'home_branch_id' => $blocked,
            'current_branch_id' => $blocked,
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            '*.prohibited' => 'This field cannot be changed from the staff profile. Contact Hospital Administration.',
        ];
    }
}
