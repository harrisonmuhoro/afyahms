<?php

declare(strict_types=1);

use App\Models\Medication;
use App\Models\User;
use App\Modules\Admin\Rbac;
use App\Modules\Emr\Models\EmarRecord;
use App\Modules\Patients\Models\Patient;
use App\Modules\Queue\Models\Visit;
use App\Modules\Tenancy\Models\Branch;
use Illuminate\Support\Str;

beforeEach(function () {
    $this->artisan('migrate:fresh');
    $this->branch = Branch::create(['code' => 'NRB', 'name' => 'Nairobi', 'is_active' => true]);
    $this->otherBranch = Branch::create(['code' => 'NYR', 'name' => 'Nyeri', 'is_active' => true]);
    app()->instance('active_branch_id', $this->branch->id);
    Rbac::seed(app());

    $this->nurse = User::factory()->create(['home_branch_id' => $this->branch->id]);
    $this->nurse->assignRole('nurse');

    $this->medication = Medication::create(['name' => 'Amoxicillin 500mg', 'generic_name' => 'Amoxicillin', 'is_active' => true]);

    $this->makeRecord = function (Branch $branch): EmarRecord {
        $patient = Patient::create([
            'public_id'      => (string) Str::uuid(),
            'patient_number' => 'PAT-2026-'.Str::random(6),
            'branch_id'      => $branch->id,
            'first_name'     => 'Mary',
            'last_name'      => 'Wanjiku',
        ]);
        $visit = Visit::create([
            'public_id'  => (string) Str::uuid(),
            'branch_id'  => $branch->id,
            'patient_id' => $patient->id,
            'visit_date' => today()->toDateString(),
            'visit_type' => 'walk_in',
            'status'     => 'in_progress',
        ]);

        return EmarRecord::create([
            'visit_id'       => $visit->id,
            'patient_id'     => $patient->id,
            'medication_id'  => $this->medication->id,
            'dose'           => '500mg',
            'route'          => 'oral',
            'scheduled_time' => now()->addHour(),
            'status'         => 'pending',
        ]);
    };
});

test('a nurse can list pending eMAR records for their branch', function () {
    $record = ($this->makeRecord)($this->branch);
    ($this->makeRecord)($this->otherBranch);

    $response = $this->withToken($this->nurse->createToken('test')->plainTextToken)
        ->getJson('/api/v1/emar/pending');

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('id')->all())->toBe([$record->id]);
});

test('a user without emr permissions cannot list eMAR records', function () {
    $user = User::factory()->create(['home_branch_id' => $this->branch->id]);

    $this->withToken($user->createToken('test')->plainTextToken)
        ->getJson('/api/v1/emar/pending')
        ->assertForbidden();
});

test('eMAR update is limited to records in the active branch', function () {
    $own = ($this->makeRecord)($this->branch);
    $foreign = ($this->makeRecord)($this->otherBranch);

    expect($this->nurse->can('update', $own))->toBeTrue()
        ->and($this->nurse->can('update', $foreign))->toBeFalse();
});
