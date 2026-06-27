<?php

declare(strict_types=1);

namespace App\Modules\Patients\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class StoreAllergyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('patients.update') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'allergen'      => ['required', 'string', 'max:160'],
            'allergen_type' => ['required', 'in:drug,food,environmental,other'],
            'reaction'      => ['nullable', 'string', 'max:255'],
            'severity'      => ['required', 'in:mild,moderate,severe,life_threatening'],
            'onset_date'    => ['nullable', 'date', 'before_or_equal:today'],
            'is_active'     => ['sometimes', 'boolean'],
        ];
    }
}