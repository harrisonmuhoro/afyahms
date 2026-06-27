<?php

declare(strict_types=1);

namespace App\Modules\Patients\Services;

use App\Exceptions\Domain\NotFoundException;
use App\Exceptions\Domain\ValidationFailedException;
use App\Modules\Patients\Models\Patient;
use App\Modules\Patients\Models\PatientInsurance;
use App\Modules\Patients\Repositories\Contracts\PatientInsuranceRepository;
use App\Modules\Patients\Repositories\Contracts\PatientRepository;

final class PatientInsuranceService
{
    public function __construct(
        private readonly PatientInsuranceRepository $insurance,
        private readonly PatientRepository $patients,
    ) {}

    public function listForPatient(string $patientPublicId)
    {
        return $this->insurance->listForPatient($this->requirePatient($patientPublicId)->id);
    }

    public function create(string $patientPublicId, array $attributes): PatientInsurance
    {
        $patient = $this->requirePatient($patientPublicId);

        $this->assertSchemeRules($attributes);

        if ((bool) ($attributes['is_primary'] ?? false)) {
            $this->insurance->setPrimary($patient->id);
        }

        return $this->insurance->create($attributes + [
            'patient_id' => $patient->id,
            'branch_id'  => $patient->branch_id,
        ]);
    }

    public function update(string $patientPublicId, int $insuranceId, array $attributes): PatientInsurance
    {
        $patient = $this->requirePatient($patientPublicId);
        $row = $this->insurance->find($insuranceId);
        if ($row === null || $row->patient_id !== $patient->id) {
            throw new NotFoundException('Insurance not found for this patient.');
        }

        $this->assertSchemeRules($attributes + ['scheme_type' => $row->scheme_type]);

        if (array_key_exists('is_primary', $attributes) && (bool) $attributes['is_primary']) {
            $this->insurance->setPrimary($patient->id, $insuranceId);
        }

        return $this->insurance->update($row, $attributes);
    }

    public function delete(string $patientPublicId, int $insuranceId): void
    {
        $patient = $this->requirePatient($patientPublicId);
        $row = $this->insurance->find($insuranceId);
        if ($row === null || $row->patient_id !== $patient->id) {
            throw new NotFoundException('Insurance not found for this patient.');
        }

        $this->insurance->delete($row);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function assertSchemeRules(array $attributes): void
    {
        $scheme = (string) ($attributes['scheme_type'] ?? '');

        if ($scheme === 'sha' && empty($attributes['sha_id']) && empty($attributes['member_number'])) {
            throw new ValidationFailedException(
                'SHA cover requires sha_id or member_number.',
                ['field' => 'sha_id'],
            );
        }
        if ($scheme === 'private' && empty($attributes['insurer_name'])) {
            throw new ValidationFailedException(
                'Private cover requires insurer_name.',
                ['field' => 'insurer_name'],
            );
        }
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