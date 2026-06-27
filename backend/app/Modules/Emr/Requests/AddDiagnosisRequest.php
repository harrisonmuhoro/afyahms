<?php

declare(strict_types=1);

namespace App\Modules\Emr\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AddDiagnosisRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('diagnoses.create') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'icd10_code'     => ['required_without:catalog_code', 'nullable', 'string', 'max:10'],
            'catalog_code'   => ['required_without:icd10_code', 'nullable', 'string', 'max:10'],
            'description'    => ['nullable', 'string', 'max:255'],
            'diagnosis_type' => ['nullable', 'in:primary,secondary,provisional,differential'],
            'certainty'      => ['nullable', 'in:confirmed,suspected,ruled_out'],
            'onset_date'     => ['nullable', 'date'],
        ];
    }
}
