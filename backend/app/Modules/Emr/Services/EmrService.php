<?php

declare(strict_types=1);

namespace App\Modules\Emr\Services;

use App\Exceptions\Domain\ConflictException;
use App\Exceptions\Domain\NotFoundException;
use App\Models\User;
use App\Modules\Emr\Models\Diagnosis;
use App\Modules\Emr\Models\Encounter;
use App\Modules\Emr\Models\SoapNote;
use App\Modules\Emr\Repositories\Contracts\DiagnosisCatalogRepository;
use App\Modules\Emr\Repositories\Contracts\EncounterRepository;
use App\Modules\Queue\Repositories\Contracts\QueueRepository;
use App\Modules\Appointments\Services\AppointmentService;
use Illuminate\Support\Facades\DB;

/**
 * EMR orchestration: encounters, SOAP notes (signable + amendable), and
 * ICD-10 coded diagnoses.
 *
 * Clinical-safety invariants (foundation §11, docs/08 emr.sign/emr.amend):
 *  - A signed SOAP note is immutable. Edits after signing must be addenda.
 *  - Clinical rows are soft-deleted, never hard-deleted (≥10-year retention).
 */
final class EmrService
{
    public function __construct(
        private readonly EncounterRepository $encounters,
        private readonly DiagnosisCatalogRepository $catalog,
        private readonly QueueRepository $queue,
        private readonly AppointmentService $appointments,
    ) {}

    /**
     * Open (or return the existing) encounter for a visit. Idempotent: a visit
     * has at most one encounter. Links `visits.encounter_id`.
     *
     * @param array<string,mixed> $attributes chief_complaint, encounter_type, department
     */
    public function openEncounter(int $visitId, array $attributes, User $actor): Encounter
    {
        return DB::transaction(function () use ($visitId, $attributes, $actor): Encounter {
            $visit = $this->queue->findVisit($visitId);
            if ($visit === null) {
                throw new NotFoundException('Visit not found.');
            }

            // Idempotent: reuse the encounter already linked to this visit.
            $existing = $this->encounters->findEncounterByVisit($visitId);
            if ($existing !== null) {
                /** @var Encounter $existing */
                return $existing;
            }

            /** @var Encounter $encounter */
            $encounter = $this->encounters->createEncounter([
                'branch_id'       => $visit->branch_id,
                'patient_id'      => $visit->patient_id,
                'visit_id'        => $visit->id,
                'appointment_id'  => $visit->appointment_id,
                'provider_id'     => $actor->id,
                'encounter_type'  => $attributes['encounter_type'] ?? 'outpatient',
                'department'      => $attributes['department'] ?? 'DOC',
                'visit_date'      => now(),
                'status'          => 'in_progress',
                'disposition'     => 'none',
                'chief_complaint' => $attributes['chief_complaint'] ?? null,
                'created_by'      => $actor->id,
            ]);

            // Link the visit chain to this encounter.
            $visit->update(['encounter_id' => $encounter->id]);

            if ($encounter->appointment_id !== null) {
                $this->appointments->markInProgress((int) $encounter->appointment_id, (int) $encounter->id);
            }

            return $encounter;
        });
    }

    /**
     * Create or update the working SOAP note for an encounter. A signed note is
     * immutable — callers must use {@see amendSoap()} instead.
     *
     * @param array<string,mixed> $data subjective, objective, assessment, plan
     */
    public function saveSoap(int $encounterId, array $data, User $actor): SoapNote
    {
        return DB::transaction(function () use ($encounterId, $data, $actor): SoapNote {
            $encounter = $this->requireEncounter($encounterId);
            $note = $this->encounters->latestSoapNote($encounterId);

            $payload = [
                'subjective' => $data['subjective'] ?? null,
                'objective'  => $data['objective'] ?? null,
                'assessment' => $data['assessment'] ?? null,
                'plan'       => $data['plan'] ?? null,
                'authored_by'=> $actor->id,
            ];

            if ($note instanceof SoapNote && ! $note->isSigned()) {
                /** @var SoapNote */
                return $this->encounters->updateSoapNote($note, $payload);
            }

            if ($note instanceof SoapNote && $note->isSigned()) {
                throw new ConflictException(
                    'The SOAP note is signed and immutable. Create an amendment instead.',
                    409,
                    ['code' => 'NOTE_SIGNED'],
                );
            }

            /** @var SoapNote */
            return $this->encounters->createSoapNote(array_merge($payload, [
                'branch_id'    => $encounter->branch_id,
                'encounter_id' => $encounter->id,
                'patient_id'   => $encounter->patient_id,
                'is_amended'   => false,
            ]));
        });
    }

    /** Sign (lock) the latest SOAP note. Requires `emr.sign`. */
    public function signSoap(int $encounterId, User $actor): SoapNote
    {
        return DB::transaction(function () use ($encounterId, $actor): SoapNote {
            $this->requireEncounter($encounterId);
            $note = $this->encounters->latestSoapNote($encounterId);
            if (! $note instanceof SoapNote) {
                throw new ConflictException('No SOAP note to sign. Save the note first.', 409);
            }
            if ($note->isSigned()) {
                throw new ConflictException('SOAP note is already signed.', 409, ['code' => 'ALREADY_SIGNED']);
            }
            if ($this->isSoapNoteEmpty($note)) {
                throw new ConflictException(
                    'Cannot sign an empty note. Enter at least one of Subjective, Objective, Assessment, or Plan.',
                    409,
                    ['code' => 'EMPTY_NOTE'],
                );
            }

            /** @var SoapNote */
            return $this->encounters->updateSoapNote($note, [
                'signed_at'   => now(),
                'authored_by' => $note->authored_by ?? $actor->id,
            ]);
        });
    }

    /**
     * Acknowledge a signed SOAP note. Records which user confirmed they have
     * read the signed care instructions (typically a nurse). Idempotent: calling
     * again updates the acknowledger and timestamp.
     *
     * Audit requirement (post_signature_soap_actions.md): every post-signature
     * action is logged with actor, role, action, timestamp, note_id.
     */
    public function acknowledgeSoap(int $encounterId, User $actor): SoapNote
    {
        return DB::transaction(function () use ($encounterId, $actor): SoapNote {
            $this->requireEncounter($encounterId);
            $note = $this->encounters->latestSoapNote($encounterId);
            if (! $note instanceof SoapNote) {
                throw new NotFoundException('No SOAP note found for this encounter.');
            }
            if (! $note->isSigned()) {
                throw new ConflictException(
                    'Only a signed note can be acknowledged.',
                    409,
                    ['code' => 'NOTE_NOT_SIGNED'],
                );
            }

            /** @var SoapNote */
            return $this->encounters->updateSoapNote($note, [
                'acknowledged_by' => $actor->id,
                'acknowledged_at' => now(),
            ]);
        });
    }

    /**
     * Append a signed addendum to an already-signed note. The prior note stays
     * immutable; a new `is_amended` note is created and signed.
     *
     * @param array<string,mixed> $data subjective, objective, assessment, plan
     */
    public function amendSoap(int $encounterId, array $data, User $actor): SoapNote
    {
        return DB::transaction(function () use ($encounterId, $data, $actor): SoapNote {
            $encounter = $this->requireEncounter($encounterId);
            $note = $this->encounters->latestSoapNote($encounterId);
            if (! $note instanceof SoapNote || ! $note->isSigned()) {
                throw new ConflictException(
                    'Amendments require an existing signed note.',
                    409,
                    ['code' => 'NO_SIGNED_NOTE'],
                );
            }

            /** @var SoapNote */
            return $this->encounters->createSoapNote([
                'branch_id'    => $encounter->branch_id,
                'encounter_id' => $encounter->id,
                'patient_id'   => $encounter->patient_id,
                'subjective'   => $data['subjective'] ?? null,
                'objective'    => $data['objective'] ?? null,
                'assessment'   => $data['assessment'] ?? null,
                'plan'         => $data['plan'] ?? null,
                'authored_by'  => $actor->id,
                'signed_at'    => now(),
                'is_amended'   => true,
            ]);
        });
    }

    /**
     * Attach a coded diagnosis to an encounter. If `catalog_code` resolves to a
     * catalog entry, its code+description are snapshotted onto the diagnosis.
     *
     * @param array<string,mixed> $data catalog_code|icd10_code, description, diagnosis_type, certainty, onset_date
     */
    public function addDiagnosis(int $encounterId, array $data, User $actor): Diagnosis
    {
        return DB::transaction(function () use ($encounterId, $data, $actor): Diagnosis {
            $encounter = $this->requireEncounter($encounterId);

            $code = (string) ($data['icd10_code'] ?? $data['catalog_code'] ?? '');
            $description = $data['description'] ?? null;
            $catalogId = null;

            $entry = $code !== '' ? $this->catalog->findByCode($code) : null;
            if ($entry !== null) {
                $catalogId = $entry->id;
                $code = $entry->code;
                $description ??= $entry->description;
            }

            if ($code === '') {
                throw new ConflictException('A diagnosis requires an ICD-10 code.', 422, ['code' => 'NO_ICD10']);
            }

            /** @var Diagnosis */
            return $this->encounters->createDiagnosis([
                'branch_id'            => $encounter->branch_id,
                'encounter_id'         => $encounter->id,
                'patient_id'           => $encounter->patient_id,
                'diagnosis_catalog_id' => $catalogId,
                'icd10_code'           => $code,
                'description'          => $description,
                'diagnosis_type'       => $data['diagnosis_type'] ?? 'primary',
                'certainty'            => $data['certainty'] ?? 'confirmed',
                'onset_date'           => $data['onset_date'] ?? null,
                'diagnosed_by'         => $actor->id,
            ]);
        });
    }

    /** Soft-delete a diagnosis (clinical rows are never hard-deleted). */
    public function removeDiagnosis(int $diagnosisId, User $actor): void
    {
        $diagnosis = $this->encounters->findDiagnosis($diagnosisId);
        if (! $diagnosis instanceof Diagnosis) {
            throw new NotFoundException('Diagnosis not found.');
        }
        $diagnosis->delete();
    }

    /** Close an encounter with a disposition. */
    public function completeEncounter(int $encounterId, ?string $disposition, User $actor): Encounter
    {
        return DB::transaction(function () use ($encounterId, $disposition, $actor): Encounter {
            $encounter = $this->requireEncounter($encounterId);
            if ($encounter->status === 'completed') {
                return $encounter;
            }

            /** @var Encounter */
            $completed = $this->encounters->updateEncounter($encounter, [
                'status'      => 'completed',
                'disposition' => $disposition ?? $encounter->disposition,
                'closed_at'   => now(),
            ]);

            if ($completed->appointment_id !== null) {
                $this->appointments->markCompleted((int) $completed->appointment_id, (int) $completed->id);
            }

            return $completed;
        });
    }

    /** True when every SOAP field is null or whitespace-only. */
    private function isSoapNoteEmpty(SoapNote $note): bool
    {
        $combined = trim((string) $note->subjective)
            . trim((string) $note->objective)
            . trim((string) $note->assessment)
            . trim((string) $note->plan);

        return $combined === '';
    }

    private function requireEncounter(int $encounterId): Encounter
    {
        $encounter = $this->encounters->findEncounter($encounterId);
        if (! $encounter instanceof Encounter) {
            throw new NotFoundException('Encounter not found.');
        }

        return $encounter;
    }
}
