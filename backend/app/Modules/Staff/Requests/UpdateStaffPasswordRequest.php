<?php

declare(strict_types=1);

namespace App\Modules\Staff\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateStaffPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('profile.self.update.password') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $min = (int) config('auth.password.min_length', 5);

        return [
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:'.$min, 'confirmed', 'different:current_password'],
        ];
    }
}
