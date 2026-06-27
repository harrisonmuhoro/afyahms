<?php

declare(strict_types=1);

namespace App\Support\Repositories\Contracts;

/**
 * Marker interface for all repository contracts.
 * Concrete repositories extend EloquentRepository.
 */
interface Repository
{
    public function model(): string;
}