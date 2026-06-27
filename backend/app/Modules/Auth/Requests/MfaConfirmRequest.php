<?php

declare(strict_types=1);

namespace App\Modules\Auth\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class MfaConfirmRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'code'         => ['nullable', 'string', 'min:6', 'max:10'],
            'recovery'     => ['nullable', 'string', 'min:14', 'max:20'],
            // exactly one of the two must be present
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            if (! $this->filled('code') && ! $this->filled('recovery')) {
                $v->errors()->add('code', 'Either a TOTP code or a recovery code is required.');
            }
        });
    }
}