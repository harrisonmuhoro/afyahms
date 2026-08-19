<?php

declare(strict_types=1);

namespace App\Modules\Messages\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'recipient_ids' => ['required_without:conversation_id', 'array', 'min:1'],
            'recipient_ids.*' => ['exists:users,id'],
            'conversation_id' => ['nullable', 'exists:conversations,id'],
            'subject' => ['nullable', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:5000'],
        ];
    }
}
