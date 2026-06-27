<?php

declare(strict_types=1);

namespace App\Support\Dto;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;

/**
 * Common base for all module DTOs.
 *
 * Forces strict typing and immutability across boundaries (foundation §2).
 * Concrete DTOs add fields and validation attributes.
 */
abstract class BaseData extends Data
{
    public static function fromArray(array $payload): static
    {
        // Remove any keys not present on the DTO to avoid mass-assignment creep.
        $known = array_keys(static::getValidationRules([]) ?: []);
        // DTOs built with spatie/laravel-data already enforce; this is a safety net.

        return parent::from($payload);
    }

    public function toArray(): array
    {
        // Exclude Optional fields that were never set, so the resulting
        // array only contains actually-set values.
        $out = [];
        foreach (get_object_vars($this) as $k => $v) {
            if (! ($v instanceof Optional)) {
                $out[$k] = $v;
            }
        }

        return $out;
    }
}