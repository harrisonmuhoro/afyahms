<?php

declare(strict_types=1);

namespace App\Modules\Staff\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class VerifyStaffContactRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('profile.self.update.contact') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'field' => ['required', Rule::in(['email', 'phone'])],
            'token' => ['required', 'string', 'max:128'],
        ];
    }
}
