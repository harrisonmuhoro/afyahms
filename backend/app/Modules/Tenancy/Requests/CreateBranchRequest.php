<?php

declare(strict_types=1);

namespace App\Modules\Tenancy\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CreateBranchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('branches.create') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'code'             => ['required', 'string', 'max:8', 'regex:/^[A-Z]{2,8}$/', 'unique:branches,code'],
            'name'             => ['required', 'string', 'max:255'],
            'address'          => ['nullable', 'string', 'max:500'],
            'phone'            => ['nullable', 'string', 'max:32'],
            'email'            => ['nullable', 'email'],
            'timezone'         => ['nullable', 'string', 'max:64'],
            'currency'         => ['nullable', 'string', 'size:3'],
            'is_active'        => ['boolean'],
            'mpesa_shortcode'  => ['nullable', 'string', 'max:32'],
            'sha_facility_code'=> ['nullable', 'string', 'max:64'],
        ];
    }
}