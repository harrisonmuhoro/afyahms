<?php

declare(strict_types=1);

namespace App\Support\Repositories;

use App\Support\Repositories\Contracts\Repository as RepositoryContract;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Shared Eloquent repository behavior.
 *
 * Module-specific repositories extend this and add their typed methods;
 * they never expose Eloquent::Query directly to the service layer.
 *
 * @template TModel of Model
 */
abstract class EloquentRepository implements RepositoryContract
{
    /** @var class-string<TModel> */
    protected string $modelClass;

    public function model(): string
    {
        return $this->modelClass;
    }

    /** @return Builder<TModel> */
    public function newQuery(): Builder
    {
        /** @var class-string<TModel> $class */
        $class = $this->modelClass;

        return $class::query();
    }

    /** @return TModel|null */
    public function find(mixed $id): ?Model
    {
        /** @var TModel|null */
        return $this->newQuery()->find($id);
    }

    /** @return TModel|null */
    public function findBy(string $field, mixed $value): ?Model
    {
        /** @var TModel|null */
        return $this->newQuery()->where($field, $value)->first();
    }

    /** @return TModel */
    public function findOrFail(mixed $id): Model
    {
        /** @var TModel */
        return $this->newQuery()->findOrFail($id);
    }

    /** @return TModel */
    public function create(array $attributes): Model
    {
        /** @var TModel */
        return $this->newQuery()->create($attributes);
    }

    /** @return TModel */
    public function update(Model $model, array $attributes): Model
    {
        $model->update($attributes);

        /** @var TModel */
        return $model;
    }

    public function delete(Model $model): bool
    {
        return (bool) $model->delete();
    }
}