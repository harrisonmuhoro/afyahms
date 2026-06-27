<?php

declare(strict_types=1);

namespace App\Modules\Patients\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateNextOfKinRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('patients.update') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'full_name'      => ['sometimes', 'string', 'max:160'],
            'relationship'   => ['sometimes', 'in:spouse,parent,child,sibling,guardian,grandparent,uncle_aunt,niece_nephew,friend,other'],
            'phone'          => ['sometimes', 'string', 'max:30', 'regex:/^(\+?254|0)?[7-9]\d{8}$/'],
            'alt_phone'      => ['sometimes', 'nullable', 'string', 'max:30', 'regex:/^(\+?254|0)?[7-9]\d{8}$/'],
            'email'          => ['sometimes', 'nullable', 'email', 'max:191'],
            'address'        => ['sometimes', 'nullable', 'string', 'max:255'],
            'is_primary'     => ['sometimes', 'boolean'],
            'is_emergency'   => ['sometimes', 'boolean'],
        ];
    }
}