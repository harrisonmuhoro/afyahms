<?php

declare(strict_types=1);

namespace App\Modules\Patients\Repositories\Contracts;

use App\Modules\Patients\Models\PatientInsurance;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

interface PatientInsuranceRepository
{
    /** @return Collection<int, PatientInsurance> */
    public function listForPatient(int $patientId): Collection;

    public function find(mixed $id): ?Model;

    public function create(array $attributes): Model;

    public function update(Model $model, array $attributes): Model;

    public function delete(Model $model): bool;

    public function setPrimary(int $patientId, int $exceptId = 0): void;
}