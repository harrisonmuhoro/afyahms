<?php

declare(strict_types=1);

namespace App\Modules\Patients\Services;

use App\Exceptions\Domain\ConflictException;
use App\Exceptions\Domain\ForbiddenException;
use App\Exceptions\Domain\NotFoundException;
use App\Exceptions\Domain\ValidationFailedException;
use App\Models\User;
use App\Modules\Audit\Services\AuditLogService;
use App\Modules\Patients\Dto\PatientDto;
use App\Modules\Patients\Models\Patient;
use App\Modules\Patients\Repositories\Contracts\PatientRepository;
use App\Modules\Tenancy\Services\BranchContext;
use App\Support\Sequences\SequenceService;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * High-level patient operations. Single entry point for controllers.
 * Repositories stay thin (CRUD + search); business rules live here.
 */
final class PatientService
{
    public function __construct(
        private readonly PatientRepository $patients,
        private readonly DedupeMatcher $dedupe,
        private readonly SequenceService $sequences,
        private readonly BranchContext $branchContext,
        private readonly AuditLogService $audit,
    ) {}

    /**
     * Register a new patient. Returns the persisted Patient.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function register(array $attributes, ?User $actor = null): Patient
    {
        $branchId = $this->resolveBranchId($actor, $attributes['branch_id'] ?? null);
        $dto = PatientDto::fromArray($attributes);

        $override = (bool) ($attributes['dedupe_override'] ?? false);
        if (! $override) {
            $candidates = $this->dedupe->candidatesFor($attributes);
            if ($candidates->isNotEmpty()) {
                $top = $candidates->first();
                throw new ConflictException(
                    'A similar patient already exists. Use dedupe_override to register anyway.',
                    409,
                    [
                        'code'      => 'PATIENT_DUPLICATE',
                        'candidates'=> $candidates->map(fn ($c) => [
                            'public_id'      => $c['patient']->public_id,
                            'patient_number' => $c['patient']->patient_number,
                            'full_name'      => $c['patient']->fullName(),
                            'score'          => $c['score'],
                            'tier'           => $c['tier'],
                            'signals'        => $c['signals'],
                        ])->values()->all(),
                    ],
                );
            }
        }

        $year = Carbon::now()->year;
        $patientNumber = $this->sequences->next(
            scope: "patient:{$year}",
            prefix: "PAT-{$year}",
            digits: 6,
        );

        $payload = $dto->toModelAttributes($branchId, $actor?->id);
        $payload['patient_number'] = $patientNumber;

        return $this->patients->create($payload);
    }

    /**
     * Update demographics on an existing patient. `If-Match` is the caller's
     * responsibility — this method writes what it's given.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function update(Patient $patient, array $attributes, ?User $actor = null, ?Request $request = null): Patient
    {
        unset($attributes['confirmation_reason'], $attributes['current_password']);

        $current = $patient->only([
            'first_name', 'middle_name', 'last_name',
            'national_id', 'sha_number', 'date_of_birth',
            'gender', 'marital_status', 'blood_group',
            'phone', 'email', 'county', 'sub_county',
            'address', 'occupation', 'photo_path',
        ]);
        if ($current['date_of_birth'] instanceof \DateTimeInterface) {
            $current['date_of_birth'] = $current['date_of_birth']->format('Y-m-d');
        }

        $dto = PatientDto::fromArray($attributes + $current);
        $payload = $dto->toModelAttributes($patient->branch_id, null);
        $before = $patient->only(array_keys($payload));

        if (($before['date_of_birth'] ?? null) instanceof \DateTimeInterface) {
            $before['date_of_birth'] = $before['date_of_birth']->format('Y-m-d');
        }

        $updated = $this->patients->update($patient, $payload);

        $action = match (true) {
            $actor !== null && (int) $patient->portal_user_id === (int) $actor->id => 'self_updated',
            $actor !== null && $actor->hasRole('superadmin') => 'superadmin_updated',
            default => 'admin_updated',
        };

        $this->audit->recordFieldChanges(
            event: 'patient.demographics.updated',
            actor: $actor,
            request: $request,
            subject: $updated,
            before: $before,
            after: $payload,
            context: ['action' => $action],
        );

        return $updated;
    }

    /**
     * Soft-delete a patient. Restricted to `patients.delete` permission
     * (caller must check). Clinical data is never hard-deleted (10-year
     * retention per Foundation §11).
     */
    public function softDelete(Patient $patient): void
    {
        $patient->delete();
    }

    public function findByPublicId(string $publicId): Patient
    {
        $patient = $this->patients->findByPublicId($publicId);

        if ($patient === null) {
            throw new NotFoundException('Patient not found.');
        }

        return $patient;
    }

    public function findByPatientNumber(string $patientNumber): Patient
    {
        $patient = $this->patients->findByPatientNumber($patientNumber);

        if ($patient === null) {
            throw new NotFoundException('Patient not found.');
        }

        return $patient;
    }

    /**
     * @return EloquentCollection<int, Patient>
     */
    public function search(string $query, int $limit = 10): EloquentCollection
    {
        return $this->patients->search($query, $limit);
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function paginate(array $filters, int $perPage = 25): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        return $this->patients->paginate($filters, $perPage);
    }

    /**
     * Merge one patient INTO another. Source is marked merged (never deleted)
     * per Foundation §11. Requires `patients.merge`.
     */
    public function merge(Patient $source, Patient $target, string $reason, ?User $actor = null): void
    {
        if ($source->id === $target->id) {
            throw new ValidationFailedException('Source and target patients must differ.');
        }
        if ($source->isMerged()) {
            throw new ConflictException('Source patient is already merged.', 409, ['code' => 'PATIENT_ALREADY_MERGED']);
        }
        if ($target->isMerged()) {
            throw new ConflictException('Target patient has been merged.', 409, ['code' => 'PATIENT_TARGET_MERGED']);
        }

        $this->patients->softMerge($source, $target);
    }

    private function resolveBranchId(?User $actor, mixed $requested): int
    {
        $active = $this->branchContext->get();

        if ($actor !== null && $actor->can('branch.view-all') && $requested !== null) {
            return (int) $requested;
        }

        if ($active !== null) {
            return $active;
        }

        throw new ForbiddenException('No active branch resolved for this request.');
    }
}
