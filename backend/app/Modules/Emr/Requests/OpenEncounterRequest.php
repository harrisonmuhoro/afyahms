<?php

declare(strict_types=1);

namespace App\Modules\Emr\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class OpenEncounterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('emr.create') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'visit_id'        => ['required', 'integer', 'exists:visits,id'],
            'encounter_type'  => ['nullable', 'in:outpatient,inpatient,emergency,teleconsult,procedure'],
            'department'      => ['nullable', 'string', 'max:80'],
            'chief_complaint' => ['nullable', 'string', 'max:255'],
        ];
    }
}
