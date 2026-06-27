<?php

declare(strict_types=1);

namespace App\Modules\Queue\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class QueueActionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'reason'        => ['nullable', 'string', 'max:255'],
            'next_station'  => ['nullable', 'in:REC,TRI,DOC,LAB,PHA,BIL,RAD'],
            'mts_category'  => ['nullable', 'in:red,orange,yellow,green,blue'],
            'priority'      => ['nullable', 'in:normal,priority,emergency'],
        ];
    }
}
