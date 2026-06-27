<?php

declare(strict_types=1);

namespace App\Modules\Queue\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class OpenVisitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('visits.create') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'patient_id'  => ['required', 'integer', 'exists:patients,id'],
            'visit_type'  => ['required', 'in:walk_in,appointment,referral,follow_up,emergency'],
            'department'  => ['sometimes', 'in:REC,TRI,DOC,LAB,PHA,BIL,RAD'],
        ];
    }
}
