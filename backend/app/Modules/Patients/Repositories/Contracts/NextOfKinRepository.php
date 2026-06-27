<?php

declare(strict_types=1);

namespace App\Modules\Patients\Repositories\Contracts;

use App\Modules\Patients\Models\PatientNextOfKin;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

interface NextOfKinRepository
{
    /** @return Collection<int, PatientNextOfKin> */
    public function listForPatient(int $patientId): Collection;

    public function find(mixed $id): ?Model;

    public function create(array $attributes): Model;

    public function update(Model $model, array $attributes): Model;

    public function delete(Model $model): bool;

    /**
     * If `$attributes['is_primary']` is true, demote any existing primary
     * for the same patient. Keeps the cardinality invariant (one primary).
     */
    public function setPrimary(int $patientId, int $exceptId = 0): void;
}