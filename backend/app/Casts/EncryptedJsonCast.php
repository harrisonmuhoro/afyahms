<?php

declare(strict_types=1);

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/**
 * EncryptedJson cast — stores an array as encrypted JSON.
 * For PII fields that need both structure and encryption at rest.
 *
 * Pairs with Laravel's `encrypted` cast where a single scalar is needed;
 * this is for structured PII (next-of-kin list, address breakdown, etc.).
 */
final class EncryptedJsonCast implements CastsAttributes
{
    public function get(Model $model, string $key, mixed $value, array $attributes): array
    {
        if ($value === null) {
            return [];
        }

        $decoded = json_decode($value, true);

        return is_array($decoded) ? $decoded : [];
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): string
    {
        if ($value === null || $value === []) {
            return '{}';
        }

        return json_encode($value, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
    }
}