<?php

declare(strict_types=1);

namespace App\Modules\Patients\Services;

use App\Exceptions\Domain\NotFoundException;
use App\Models\User;
use App\Modules\Patients\Models\Allergy;
use App\Modules\Patients\Models\Patient;
use App\Modules\Patients\Repositories\Contracts\AllergyRepository;
use App\Modules\Patients\Repositories\Contracts\PatientRepository;

final class AllergyService
{
    public function __construct(
        private readonly AllergyRepository $allergies,
        private readonly PatientRepository $patients,
    ) {}

    public function listForPatient(string $patientPublicId)
    {
        return $this->allergies->listForPatient($this->requirePatient($patientPublicId)->id);
    }

    public function create(string $patientPublicId, array $attributes, ?User $actor = null): Allergy
    {
        $patient = $this->requirePatient($patientPublicId);

        return $this->allergies->create($attributes + [
            'patient_id'  => $patient->id,
            'branch_id'   => $patient->branch_id,
            'recorded_by' => $actor?->id,
        ]);
    }

    public function update(string $patientPublicId, int $allergyId, array $attributes): Allergy
    {
        $patient = $this->requirePatient($patientPublicId);
        $row = $this->allergies->find($allergyId);
        if ($row === null || $row->patient_id !== $patient->id) {
            throw new NotFoundException('Allergy not found for this patient.');
        }

        return $this->allergies->update($row, $attributes);
    }

    public function delete(string $patientPublicId, int $allergyId): void
    {
        $patient = $this->requirePatient($patientPublicId);
        $row = $this->allergies->find($allergyId);
        if ($row === null || $row->patient_id !== $patient->id) {
            throw new NotFoundException('Allergy not found for this patient.');
        }

        $this->allergies->delete($row);
    }

    private function requirePatient(string $publicId): Patient
    {
        $patient = $this->patients->findByPublicId($publicId);
        if ($patient === null) {
            throw new NotFoundException('Patient not found.');
        }

        return $patient;
    }
}