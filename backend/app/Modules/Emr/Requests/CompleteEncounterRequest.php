<?php

declare(strict_types=1);

namespace App\Modules\Emr\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CompleteEncounterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('emr.update') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'disposition' => ['nullable', 'in:discharged,admitted,referred,deceased,followup,none'],
        ];
    }
}
