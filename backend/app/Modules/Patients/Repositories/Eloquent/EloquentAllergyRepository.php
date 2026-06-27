<?php

declare(strict_types=1);

namespace App\Modules\Patients\Repositories\Eloquent;

use App\Modules\Patients\Models\Allergy;
use App\Modules\Patients\Repositories\Contracts\AllergyRepository;
use App\Support\Repositories\EloquentRepository;
use Illuminate\Database\Eloquent\Model as EloquentModel;
use Illuminate\Support\Collection;

/**
 * @extends EloquentRepository<Allergy>
 */
final class EloquentAllergyRepository extends EloquentRepository implements AllergyRepository
{
    protected string $modelClass = Allergy::class;

    public function listForPatient(int $patientId): Collection
    {
        return $this->newQuery()
            ->where('patient_id', $patientId)
            ->orderByDesc('is_active')
            ->orderByDesc('severity')
            ->orderBy('allergen')
            ->get();
    }

    public function find(mixed $id): ?EloquentModel
    {
        /** @var Allergy|null */
        return $this->newQuery()->find($id);
    }

    public function create(array $attributes): EloquentModel
    {
        /** @var Allergy */
        return $this->newQuery()->create($attributes);
    }

    public function update(EloquentModel $model, array $attributes): EloquentModel
    {
        $model->update($attributes);

        /** @var Allergy */
        return $model;
    }

    public function delete(EloquentModel $model): bool
    {
        return (bool) $model->delete();
    }

    public function activeDrugAllergiesFor(int $patientId): Collection
    {
        return $this->newQuery()
            ->where('patient_id', $patientId)
            ->where('is_active', true)
            ->where('allergen_type', 'drug')
            ->get();
    }
}