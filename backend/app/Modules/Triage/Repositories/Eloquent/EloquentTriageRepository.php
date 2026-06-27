<?php

declare(strict_types=1);

namespace App\Modules\Triage\Repositories\Eloquent;

use App\Modules\Triage\Models\TriageAssessment;
use App\Modules\Triage\Repositories\Contracts\TriageRepository;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

final class EloquentTriageRepository implements TriageRepository
{
    public function createAssessment(array $attributes): Model
    {
        /** @var TriageAssessment */
        return TriageAssessment::query()->create($attributes);
    }

    public function findByVisit(int $visitId): ?Model
    {
        /** @var TriageAssessment|null */
        return TriageAssessment::query()
            ->where('visit_id', $visitId)
            ->orderByDesc('assessed_at')
            ->first();
    }

    public function findById(int $id): ?Model
    {
        /** @var TriageAssessment|null */
        return TriageAssessment::query()->find($id);
    }

    public function latestForPatient(int $patientId, int $limit = 5): Collection
    {
        return TriageAssessment::query()
            ->where('patient_id', $patientId)
            ->orderByDesc('assessed_at')
            ->limit($limit)
            ->get();
    }
}
