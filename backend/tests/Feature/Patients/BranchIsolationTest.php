<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\Admin\Rbac;
use App\Modules\Patients\Models\Patient;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Scopes\BranchScope;
use App\Modules\Tenancy\Services\BranchContext;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

beforeEach(function () {
    $this->artisan('migrate:fresh');
    Rbac::seed(app());

    $this->branchA = Branch::create([
        'code' => 'BRA',
        'name' => 'Branch A',
        'is_active' => true,
    ]);
    $this->branchB = Branch::create([
        'code' => 'BRB',
        'name' => 'Branch B',
        'is_active' => true,
    ]);

    app(BranchContext::class)->set($this->branchA->id);
    BranchScope::enableFor($this->branchA->id);

    $this->branchAAdmin = User::factory()->create([
        'home_branch_id' => $this->branchA->id,
        'current_branch_id' => $this->branchA->id,
    ]);
    $this->branchAAdmin->assignRole('hospital-admin');

    $this->superadmin = User::factory()->create([
        'home_branch_id' => $this->branchA->id,
        'current_branch_id' => $this->branchA->id,
    ]);
    $this->superadmin->assignRole('superadmin');

    $this->makePatient = static function (int $branchId, string $patientNumber): Patient {
        return Patient::withoutGlobalScopes()->create([
            'public_id' => (string) Str::uuid(),
            'patient_number' => $patientNumber,
            'branch_id' => $branchId,
            'first_name' => 'Test',
            'last_name' => 'Patient',
            'gender' => 'unknown',
            'marital_status' => 'unknown',
            'blood_group' => 'unknown',
            'is_active' => true,
        ]);
    };
});

test('patient global scope hides patients from other branches', function () {
    $branchBPatient = ($this->makePatient)($this->branchB->id, 'PAT-2026-000001');

    $this->actingAs($this->branchAAdmin);

    expect(Patient::query()->where('public_id', $branchBPatient->public_id)->first())->toBeNull();
});

test('patient manage policy blocks cross-branch writes when a scoped fetch is bypassed', function () {
    $branchBPatient = ($this->makePatient)($this->branchB->id, 'PAT-2026-000002');
    $bypassedPatient = Patient::withoutGlobalScope(BranchScope::class)
        ->where('public_id', $branchBPatient->public_id)
        ->firstOrFail();

    expect(Gate::forUser($this->branchAAdmin)->allows('manage', $bypassedPatient))->toBeFalse();
});

test('superadmin can still see cross-branch patients', function () {
    $branchBPatient = ($this->makePatient)($this->branchB->id, 'PAT-2026-000003');

    $this->actingAs($this->superadmin);

    expect(Patient::query()->where('public_id', $branchBPatient->public_id)->first())
        ->not->toBeNull()
        ->public_id->toBe($branchBPatient->public_id);
});
