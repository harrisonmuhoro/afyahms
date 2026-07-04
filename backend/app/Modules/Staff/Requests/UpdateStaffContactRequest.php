<?php

declare(strict_types=1);

namespace App\Modules\Staff\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateStaffContactRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('profile.self.update.contact') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $field = (string) $this->input('field');
        $valueRules = $field === 'email'
            ? ['required', 'email', 'max:191', Rule::unique('users', 'email')->ignore($this->user()?->id)]
            : ['required', 'string', 'max:32', 'regex:/^(\+?254|0)?[7-9]\d{8}$/', Rule::unique('users', 'phone')->ignore($this->user()?->id)];

        return [
            'current_password' => ['required', 'string'],
            'field' => ['required', Rule::in(['email', 'phone'])],
            'new_value' => $valueRules,
        ];
    }
}
