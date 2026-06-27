<?php

declare(strict_types=1);

namespace App\Modules\Patients\Repositories\Contracts;

use App\Modules\Patients\Models\Allergy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

interface AllergyRepository
{
    /** @return Collection<int, Allergy> */
    public function listForPatient(int $patientId): Collection;

    public function find(mixed $id): ?Model;

    public function create(array $attributes): Model;

    public function update(Model $model, array $attributes): Model;

    public function delete(Model $model): bool;

    /**
     * Used by ClinicalAlerts engine — fast lookup of currently-active drug
     * allergies for a patient (no soft-deleted rows, is_active=1).
     *
     * @return Collection<int, Allergy>
     */
    public function activeDrugAllergiesFor(int $patientId): Collection;
}