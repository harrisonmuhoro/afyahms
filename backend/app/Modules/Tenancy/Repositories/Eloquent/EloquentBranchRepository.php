<?php

declare(strict_types=1);

namespace App\Modules\Tenancy\Repositories\Eloquent;

use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Repositories\Contracts\BranchRepository;
use App\Support\Repositories\EloquentRepository;
use Illuminate\Support\Collection;

/**
 * @extends EloquentRepository<Branch>
 */
final class EloquentBranchRepository extends EloquentRepository implements BranchRepository
{
    protected string $modelClass = Branch::class;

    public function find(mixed $id): ?Branch
    {
        /** @var Branch|null */
        return $this->newQuery()->find($id);
    }

    public function findByCode(string $code): ?Branch
    {
        /** @var Branch|null */
        return $this->newQuery()->where('code', $code)->first();
    }

    public function listActive(): Collection
    {
        return $this->newQuery()->where('is_active', true)->orderBy('name')->get();
    }

    public function create(array $attributes): \Illuminate\Database\Eloquent\Model
    {
        /** @var Branch */
        return $this->newQuery()->create($attributes);
    }
}