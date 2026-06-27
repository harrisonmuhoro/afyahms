<?php

declare(strict_types=1);

namespace App\Modules\Emr\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class SaveSoapRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('emr.update') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'subjective' => ['nullable', 'string', 'max:10000'],
            'objective'  => ['nullable', 'string', 'max:10000'],
            'assessment' => ['nullable', 'string', 'max:10000'],
            'plan'       => ['nullable', 'string', 'max:10000'],
        ];
    }
}
