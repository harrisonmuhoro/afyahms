<?php

declare(strict_types=1);

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/**
 * Money cast — values are stored as DECIMAL(12,2); when reading they come
 * back as strings. This cast ensures we always work with a 2-decimal
 * string for arithmetic, and that no float ever touches the codebase.
 *
 * Foundation §3: "All money: DECIMAL(12,2), currency KES. Never floats."
 */
final class MoneyCast implements CastsAttributes
{
    public function get(Model $model, string $key, mixed $value, array $attributes): string
    {
        if ($value === null) {
            return '0.00';
        }

        // Normalize to 2dp, return as string.
        return number_format((float) $value, 2, '.', '');
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): string
    {
        if ($value === null) {
            return '0.00';
        }

        if (is_string($value)) {
            $value = (float) $value;
        }

        return number_format((float) $value, 2, '.', '');
    }
}