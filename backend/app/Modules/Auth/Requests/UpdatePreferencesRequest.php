<?php

declare(strict_types=1);

namespace App\Modules\Auth\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdatePreferencesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'locale' => [
                'sometimes',
                'required',
                'string',
                Rule::in(config('hospital.available_locales', ['en', 'sw'])),
            ],
            'theme' => [
                'sometimes',
                'required',
                'string',
                Rule::in(['light', 'dark', 'system']),
            ],
        ];
    }
}
