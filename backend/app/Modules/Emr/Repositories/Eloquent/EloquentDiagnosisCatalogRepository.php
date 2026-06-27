<?php

declare(strict_types=1);

namespace App\Modules\Emr\Repositories\Eloquent;

use App\Modules\Emr\Models\DiagnosisCatalog;
use App\Modules\Emr\Repositories\Contracts\DiagnosisCatalogRepository;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

final class EloquentDiagnosisCatalogRepository implements DiagnosisCatalogRepository
{
    public function findByCode(string $code): ?Model
    {
        /** @var DiagnosisCatalog|null */
        return DiagnosisCatalog::query()
            ->where('code', $code)
            ->first();
    }

    public function search(string $term, int $limit = 20): Collection
    {
        $term = trim($term);

        return DiagnosisCatalog::query()
            ->where('is_active', true)
            ->where(function ($q) use ($term): void {
                $q->where('code', 'like', $term.'%')
                    ->orWhere('description', 'like', '%'.$term.'%');
            })
            ->orderBy('code')
            ->limit($limit)
            ->get();
    }
}
