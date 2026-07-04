<?php

declare(strict_types=1);

namespace App\Modules\Staff\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UploadStaffPhotoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('profile.self.upload.photo') ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'file' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ];
    }
}
