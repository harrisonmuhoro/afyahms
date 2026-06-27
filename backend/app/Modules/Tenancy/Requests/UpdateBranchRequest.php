<?php

declare(strict_types=1);

namespace App\Modules\Tenancy\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateBranchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('branches.update') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name'             => ['sometimes', 'string', 'max:255'],
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