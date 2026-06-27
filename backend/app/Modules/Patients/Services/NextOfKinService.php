<?php

declare(strict_types=1);

namespace App\Modules\Patients\Services;

use App\Exceptions\Domain\NotFoundException;
use App\Modules\Patients\Models\Patient;
use App\Modules\Patients\Models\PatientNextOfKin;
use App\Modules\Patients\Repositories\Contracts\NextOfKinRepository;
use App\Modules\Patients\Repositories\Contracts\PatientRepository;

final class NextOfKinService
{
    public function __construct(
        private readonly NextOfKinRepository $nextOfKin,
        private readonly PatientRepository $patients,
    ) {}

    public function listForPatient(string $patientPublicId)
    {
        return $this->nextOfKin->listForPatient($this->requirePatient($patientPublicId)->id);
    }

    public function create(string $patientPublicId, array $attributes): PatientNextOfKin
    {
        $patient = $this->requirePatient($patientPublicId);

        if ((bool) ($attributes['is_primary'] ?? false)) {
            $this->nextOfKin->setPrimary($patient->id);
        }

        return $this->nextOfKin->create($attributes + [
            'patient_id' => $patient->id,
            'branch_id'  => $patient->branch_id,
        ]);
    }

    public function update(string $patientPublicId, int $nokId, array $attributes): PatientNextOfKin
    {
        $patient = $this->requirePatient($patientPublicId);
        $nok = $this->nextOfKin->find($nokId);
        if ($nok === null || $nok->patient_id !== $patient->id) {
            throw new NotFoundException('Next-of-kin not found for this patient.');
        }

        if (array_key_exists('is_primary', $attributes) && (bool) $attributes['is_primary']) {
            $this->nextOfKin->setPrimary($patient->id, $nokId);
        }

        return $this->nextOfKin->update($nok, $attributes);
    }

    public function delete(string $patientPublicId, int $nokId): void
    {
        $patient = $this->requirePatient($patientPublicId);
        $nok = $this->nextOfKin->find($nokId);
        if ($nok === null || $nok->patient_id !== $patient->id) {
            throw new NotFoundException('Next-of-kin not found for this patient.');
        }

        $this->nextOfKin->delete($nok);
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