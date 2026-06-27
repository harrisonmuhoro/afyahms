<?php

declare(strict_types=1);

namespace App\Modules\Patients\Repositories\Contracts;

use App\Modules\Patients\Models\Patient;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

interface PatientRepository
{
    public function findById(int $id): ?Patient;

    public function findByPublicId(string $publicId): ?Patient;

    public function findByPatientNumber(string $patientNumber): ?Patient;

    /**
     * Search across patient_number, full_name, phone, national_id.
     * Used by `GET /patients/search` (typeahead) and by dedupe pre-checks.
     *
     * @return Collection<int, Patient>
     */
    public function search(string $query, int $limit = 10): Collection;

    /**
     * Paginated list within the active branch. Honours branch.view-all.
     *
     * @param  array<string, mixed>  $filters
     */
    public function paginate(array $filters, int $perPage = 25): LengthAwarePaginator;

    /**
     * Find likely duplicates for the dedupe pre-check at registration.
     *
     * @return Collection<int, Patient>
     */
    public function findPotentialDuplicates(Patient $candidate): Collection;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(array $attributes): Model;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function update(Model $model, array $attributes): Model;

    /**
     * Soft-merge: copy required references from source onto target and mark
     * source as merged. Caller MUST have validated this is safe.
     */
    public function softMerge(Patient $source, Patient $target): void;
}