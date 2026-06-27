<?php

declare(strict_types=1);

namespace App\Modules\Emr\Repositories\Contracts;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

/**
 * Read access to the global ICD-10 catalog (reference data, not branch-scoped).
 */
interface DiagnosisCatalogRepository
{
    public function findByCode(string $code): ?Model;

    /** @return Collection<int, Model> */
    public function search(string $term, int $limit = 20): Collection;
}
