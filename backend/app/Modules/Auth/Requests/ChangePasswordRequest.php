<?php

declare(strict_types=1);

namespace App\Modules\Auth\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class ChangePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $min = (int) config('auth.password.min_length', 12);

        return [
            'current_password' => ['required', 'string'],
            'password'         => ['required', 'string', 'min:'.$min, 'confirmed', 'different:current_password'],
        ];
    }
}
