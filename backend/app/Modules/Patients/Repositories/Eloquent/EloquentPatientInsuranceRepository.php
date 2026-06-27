<?php

declare(strict_types=1);

namespace App\Modules\Patients\Repositories\Eloquent;

use App\Modules\Patients\Models\PatientInsurance;
use App\Modules\Patients\Repositories\Contracts\PatientInsuranceRepository;
use App\Support\Repositories\EloquentRepository;
use Illuminate\Database\Eloquent\Model as EloquentModel;
use Illuminate\Support\Collection;

/**
 * @extends EloquentRepository<PatientInsurance>
 */
final class EloquentPatientInsuranceRepository extends EloquentRepository implements PatientInsuranceRepository
{
    protected string $modelClass = PatientInsurance::class;

    public function listForPatient(int $patientId): Collection
    {
        return $this->newQuery()
            ->where('patient_id', $patientId)
            ->orderByDesc('is_primary')
            ->orderByDesc('is_active')
            ->orderByDesc('valid_from')
            ->get();
    }

    public function find(mixed $id): ?EloquentModel
    {
        /** @var PatientInsurance|null */
        return $this->newQuery()->find($id);
    }

    public function create(array $attributes): EloquentModel
    {
        /** @var PatientInsurance */
        return $this->newQuery()->create($attributes);
    }

    public function update(EloquentModel $model, array $attributes): EloquentModel
    {
        $model->update($attributes);

        /** @var PatientInsurance */
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