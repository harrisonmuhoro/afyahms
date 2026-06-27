<?php

declare(strict_types=1);

namespace App\Modules\Triage\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class RecordTriageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('triage.create') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'visit_id'         => ['required', 'integer', 'exists:visits,id'],
            'mts_level'        => ['required', 'in:red,orange,yellow,green,blue'],
            'chief_complaint'  => ['nullable', 'string', 'max:500'],
            'temperature_c'    => ['nullable', 'numeric', 'between:25,45'],
            'pulse_bpm'        => ['nullable', 'integer', 'between:20,250'],
            'respiratory_rate' => ['nullable', 'integer', 'between:0,80'],
            'systolic_bp'      => ['nullable', 'integer', 'between:40,260'],
            'diastolic_bp'     => ['nullable', 'integer', 'between:20,180'],
            'spo2_pct'         => ['nullable', 'integer', 'between:50,100'],
            'weight_kg'        => ['nullable', 'numeric', 'between:0.5,400'],
            'height_cm'        => ['nullable', 'numeric', 'between:30,260'],
            'pain_score'       => ['nullable', 'integer', 'between:0,10'],
            'notes'            => ['nullable', 'string', 'max:2000'],
        ];
    }
}
