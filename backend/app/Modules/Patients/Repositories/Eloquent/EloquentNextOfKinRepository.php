<?php

declare(strict_types=1);

namespace App\Modules\Patients\Repositories\Eloquent;

use App\Modules\Patients\Models\PatientNextOfKin;
use App\Modules\Patients\Repositories\Contracts\NextOfKinRepository;
use App\Support\Repositories\EloquentRepository;
use Illuminate\Database\Eloquent\Model as EloquentModel;
use Illuminate\Support\Collection;

/**
 * @extends EloquentRepository<PatientNextOfKin>
 */
final class EloquentNextOfKinRepository extends EloquentRepository implements NextOfKinRepository
{
    protected string $modelClass = PatientNextOfKin::class;

    public function listForPatient(int $patientId): Collection
    {
        return $this->newQuery()
            ->where('patient_id', $patientId)
            ->orderByDesc('is_primary')
            ->orderByDesc('is_emergency')
            ->orderBy('full_name')
            ->get();
    }

    public function find(mixed $id): ?EloquentModel
    {
        /** @var PatientNextOfKin|null */
        return $this->newQuery()->find($id);
    }

    public function create(array $attributes): EloquentModel
    {
        /** @var PatientNextOfKin */
        return $this->newQuery()->create($attributes);
    }

    public function update(EloquentModel $model, array $attributes): EloquentModel
    {
        $model->update($attributes);

        /** @var PatientNextOfKin */
        return $model;
    }

    public function delete(EloquentModel $model): bool
    {
        return (bool) $model->delete();
    }

    public function setPrimary(int $patientId, int $exceptId = 0): void
    {
        $this->newQuery()
            ->where('patient_id', $patientId)
            ->where('id', '!=', $exceptId)
            ->where('is_primary', true)
            ->update(['is_primary' => false]);
    }
}