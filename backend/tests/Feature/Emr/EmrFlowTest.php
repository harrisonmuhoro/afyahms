<?php

declare(strict_types=1);

use App\Exceptions\Domain\ConflictException;
use App\Models\User;
use App\Modules\Admin\Rbac;
use App\Modules\Emr\Models\DiagnosisCatalog;
use App\Modules\Emr\Models\Encounter;
use App\Modules\Emr\Models\SoapNote;
use App\Modules\Emr\Requests\AddDiagnosisRequest;
use App\Modules\Emr\Requests\SaveSoapRequest;
use App\Modules\Emr\Services\EmrService;
use App\Modules\Patients\Models\Patient;
use App\Modules\Queue\Models\Visit;
use App\Modules\Tenancy\Models\Branch;
use Illuminate\Support\Str;

beforeEach(function () {
    $this->artisan('migrate:fresh');
    $this->branch = Branch::create(['code' => 'NRB', 'name' => 'Nairobi', 'is_active' => true]);
    app()->instance('active_branch_id', $this->branch->id);
    Rbac::seed(app());

    $this->doctor = User::factory()->create(['home_branch_id' => $this->branch->id]);
    $this->doctor->assignRole('doctor');

    $this->patient = Patient::create([
        'public_id'      => (string) Str::uuid(),
        'patient_number' => 'PAT-2026-000001',
        'branch_id'      => $this->branch->id,
        'first_name'     => 'Jane',
        'last_name'      => 'Wanjiku',
    ]);

    $this->visit = Visit::create([
        'public_id'   => (string) Str::uuid(),
        'branch_id'   => $this->branch->id,
        'patient_id'  => $this->patient->id,
        'visit_date'  => today()->toDateString(),
        'visit_type'  => 'walk_in',
        'status'      => 'in_progress',
    ]);

    DiagnosisCatalog::create(['code' => 'I10', 'description' => 'Essential (primary) hypertension', 'is_active' => true]);

    $this->emr = app(EmrService::class);
});

test('opening an encounter links it to the visit and is idempotent', function () {
    $encounter = $this->emr->openEncounter($this->visit->id, ['chief_complaint' => 'Headache'], $this->doctor);

    expect($encounter)->toBeInstanceOf(Encounter::class)
        ->and($encounter->patient_id)->toBe($this->patient->id)
        ->and($encounter->provider_id)->toBe($this->doctor->id)
        ->and($encounter->status)->toBe('in_progress');

    expect($this->visit->fresh()->encounter_id)->toBe($encounter->id);

    // Idempotent: a second open returns the same encounter, no duplicate row.
    $again = $this->emr->openEncounter($this->visit->id, [], $this->doctor);
    expect($again->id)->toBe($encounter->id);
    expect(Encounter::where('visit_id', $this->visit->id)->count())->toBe(1);
});

test('a signed SOAP note is immutable and edits must be amendments', function () {
    $encounter = $this->emr->openEncounter($this->visit->id, [], $this->doctor);

    $note = $this->emr->saveSoap($encounter->id, [
        'subjective' => 'Patient reports headache for 2 days',
        'objective'  => 'BP 150/95',
        'assessment' => 'Hypertension',
        'plan'       => 'Start antihypertensive',
    ], $this->doctor);

    expect($note)->toBeInstanceOf(SoapNote::class)
        ->and($note->isSigned())->toBeFalse();

    // Re-saving before signing updates the same row.
    $note2 = $this->emr->saveSoap($encounter->id, ['subjective' => 'Updated'], $this->doctor);
    expect($note2->id)->toBe($note->id);
    expect(SoapNote::where('encounter_id', $encounter->id)->count())->toBe(1);

    // Sign it.
    $signed = $this->emr->signSoap($encounter->id, $this->doctor);
    expect($signed->isSigned())->toBeTrue();

    // Saving over a signed note is rejected.
    expect(fn () => $this->emr->saveSoap($encounter->id, ['plan' => 'changed'], $this->doctor))
        ->toThrow(ConflictException::class);

    // Amendment creates a NEW signed note flagged is_amended.
    $amend = $this->emr->amendSoap($encounter->id, ['plan' => 'Add lifestyle advice'], $this->doctor);
    expect($amend->id)->not->toBe($signed->id)
        ->and($amend->is_amended)->toBeTrue()
        ->and($amend->isSigned())->toBeTrue();
    expect(SoapNote::where('encounter_id', $encounter->id)->count())->toBe(2);
});

test('adding a diagnosis snapshots the ICD-10 code from the catalog', function () {
    $encounter = $this->emr->openEncounter($this->visit->id, [], $this->doctor);

    $dx = $this->emr->addDiagnosis($encounter->id, [
        'catalog_code'   => 'I10',
        'diagnosis_type' => 'primary',
    ], $this->doctor);

    expect($dx->icd10_code)->toBe('I10')
        ->and($dx->description)->toBe('Essential (primary) hypertension')
        ->and($dx->diagnosis_catalog_id)->not->toBeNull()
        ->and($dx->diagnosis_type)->toBe('primary');
});

test('completing an encounter sets status and disposition', function () {
    $encounter = $this->emr->openEncounter($this->visit->id, [], $this->doctor);

    $done = $this->emr->completeEncounter($encounter->id, 'discharged', $this->doctor);

    expect($done->status)->toBe('completed')
        ->and($done->disposition)->toBe('discharged')
        ->and($done->closed_at)->not->toBeNull();
});

test('emr form requests require the correct permissions', function () {
    // Doctor holds emr.update + diagnoses.create; patient holds neither.
    $patientUser = User::factory()->create(['home_branch_id' => $this->branch->id]);
    $patientUser->assignRole('patient');

    $save = new SaveSoapRequest();
    $save->setUserResolver(fn () => $this->doctor);
    expect($save->authorize())->toBeTrue();

    $save->setUserResolver(fn () => $patientUser);
    expect($save->authorize())->toBeFalse();

    $dx = new AddDiagnosisRequest();
    $dx->setUserResolver(fn () => $this->doctor);
    expect($dx->authorize())->toBeTrue();
});
