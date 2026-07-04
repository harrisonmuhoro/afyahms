<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;

class CompleteProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'home_branch_id' => 'required|exists:branches,id', // Optional: check if active
            'first_name' => 'required|string|max:80',
            'middle_name' => 'nullable|string|max:80',
            'last_name' => 'required|string|max:80',
            'gender' => 'required|in:male,female,other,unknown',
            'date_of_birth' => 'required|date|before:today',
            'phone' => 'required|string|starts_with:+254|max:30',
            'county' => 'required|string|max:80',
            'sub_county' => 'nullable|string|max:80',
            'address' => 'nullable|string|max:255',
            'next_of_kin_name' => 'required|string|max:200',
            'next_of_kin_phone' => 'required|string|starts_with:+254|max:32',
            'national_id' => 'exclude_if:is_minor,true|required_if:is_minor,false|nullable|string|max:255',
            'guardian_name' => 'required_if:is_minor,true|nullable|string|max:255',
            'guardian_national_id' => 'required_if:is_minor,true|nullable|string|max:255',
            'guardian_relationship' => 'required_if:is_minor,true|nullable|string|max:80',
        ];
    }

    protected function prepareForValidation(): void
    {
        $isMinor = false;
        if ($this->has('date_of_birth')) {
            try {
                $dob = Carbon::parse($this->input('date_of_birth'));
                if ($dob->age < 18) {
                    $isMinor = true;
                }
            } catch (\Exception $e) {
                // Ignore parsing errors, validation will catch it
            }
        }
        
        $this->merge([
            'is_minor' => $isMinor,
        ]);
    }
}
