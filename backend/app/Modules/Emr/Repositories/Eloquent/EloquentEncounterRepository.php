<?php

declare(strict_types=1);

namespace App\Modules\Emr\Repositories\Eloquent;

use App\Modules\Emr\Models\Diagnosis;
use App\Modules\Emr\Models\Encounter;
use App\Modules\Emr\Models\SoapNote;
use App\Modules\Emr\Repositories\Contracts\EncounterRepository;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

final class EloquentEncounterRepository implements EncounterRepository
{
    public function createEncounter(array $attributes): Model
    {
        /** @var Encounter */
        return Encounter::query()->create($attributes);
    }

    public function findEncounter(int $id): ?Model
    {
        /** @var Encounter|null */
        return Encounter::query()
            ->with(['soapNote', 'diagnoses', 'patient'])
            ->find($id);
    }

    public function findEncounterByVisit(int $visitId): ?Model
    {
        /** @var Encounter|null */
        return Encounter::query()
            ->where('visit_id', $visitId)
            ->orderByDesc('id')
            ->first();
    }

    public function updateEncounter(Model $encounter, array $attributes): Model
    {
        $encounter->update($attributes);

        return $encounter;
    }

    public function encountersForPatient(int $patientId, int $limit = 20): Collection
    {
        return Encounter::query()
            ->where('patient_id', $patientId)
            ->with(['diagnoses', 'provider'])
            ->orderByDesc('visit_date')
            ->limit($limit)
            ->get();
    }

    public function createSoapNote(array $attributes): Model
    {
        /** @var SoapNote */
        return SoapNote::query()->create($attributes);
    }

    public function findSoapNote(int $id): ?Model
    {
        /** @var SoapNote|null */
        return SoapNote::query()->find($id);
    }

    public function latestSoapNote(int $encounterId): ?Model
    {
        /** @var SoapNote|null */
        return SoapNote::query()
            ->where('encounter_id', $encounterId)
            ->orderByDesc('id')
            ->first();
    }

    public function updateSoapNote(Model $note, array $attributes): Model
    {
        $note->update($attributes);

        return $note;
    }

    public function createDiagnosis(array $attributes): Model
    {
        /** @var Diagnosis */
        return Diagnosis::query()->create($attributes);
    }

    public function findDiagnosis(int $id): ?Model
    {
        /** @var Diagnosis|null */
        return Diagnosis::query()->find($id);
    }

    public function diagnosesForEncounter(int $encounterId): Collection
    {
        return Diagnosis::query()
            ->where('encounter_id', $encounterId)
            ->orderBy('diagnosis_type')
            ->orderByDesc('id')
            ->get();
    }
}
