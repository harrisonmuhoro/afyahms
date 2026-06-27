<?php

declare(strict_types=1);

namespace App\Modules\Emr\Repositories\Contracts;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

/**
 * Persistence for the Encounter aggregate (encounter + its SOAP note + diagnoses).
 */
interface EncounterRepository
{
    public function createEncounter(array $attributes): Model;

    public function findEncounter(int $id): ?Model;

    public function findEncounterByVisit(int $visitId): ?Model;

    public function updateEncounter(Model $encounter, array $attributes): Model;

    /** @return Collection<int, Model> */
    public function encountersForPatient(int $patientId, int $limit = 20): Collection;

    public function createSoapNote(array $attributes): Model;

    public function findSoapNote(int $id): ?Model;

    public function latestSoapNote(int $encounterId): ?Model;

    public function updateSoapNote(Model $note, array $attributes): Model;

    public function createDiagnosis(array $attributes): Model;

    public function findDiagnosis(int $id): ?Model;

    /** @return Collection<int, Model> */
    public function diagnosesForEncounter(int $encounterId): Collection;
}
