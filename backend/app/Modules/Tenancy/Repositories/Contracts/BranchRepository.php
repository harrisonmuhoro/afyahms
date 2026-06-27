<?php

declare(strict_types=1);

namespace App\Modules\Tenancy\Repositories\Contracts;

use App\Modules\Tenancy\Models\Branch;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

interface BranchRepository
{
    public function find(mixed $id): ?Branch;

    public function findByCode(string $code): ?Branch;

    public function listActive(): Collection;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(array $attributes): Model;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function update(Model $model, array $attributes): Model;
}