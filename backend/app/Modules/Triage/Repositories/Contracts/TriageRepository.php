<?php

declare(strict_types=1);

namespace App\Modules\Triage\Repositories\Contracts;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

interface TriageRepository
{
    public function createAssessment(array $attributes): Model;

    public function findByVisit(int $visitId): ?Model;

    public function findById(int $id): ?Model;

    /** @return Collection<int, Model> */
    public function latestForPatient(int $patientId, int $limit = 5): Collection;
}
