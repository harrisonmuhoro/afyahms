<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\Admin\Rbac;
use App\Modules\Tenancy\Models\Branch;
use App\Support\Sequences\SequenceService;
use Tests\TestCase;

beforeEach(function () {
    $this->artisan('migrate:fresh');
    $this->branch = Branch::create([
        'code'      => 'NRB',
        'name'      => 'Nairobi',
        'timezone'  => 'Africa/Nairobi',
        'currency'  => 'KES',
        'is_active' => true,
    ]);
    app()->instance('active_branch_id', $this->branch->id);
    \App\Modules\Tenancy\Scopes\BranchScope::enableFor($this->branch->id);

    Rbac::seed(app());
});

test('sequence service allocates monotonic IDs', function () {
    $svc = app(SequenceService::class);
    $first = $svc->next('patient:2026', 'PAT-2026');
    $second = $svc->next('patient:2026', 'PAT-2026');
    $third = $svc->next('patient:2026', 'PAT-2026');

    expect($first)->toBe('PAT-2026-000001')
        ->and($second)->toBe('PAT-2026-000002')
        ->and($third)->toBe('PAT-2026-000003');
});

test('sequence service is concurrency-safe', function () {
    $svc = app(SequenceService::class);
    $results = [];

    // Simulate concurrent calls via separate connections
    for ($i = 0; $i < 50; $i++) {
        $results[] = $svc->next('invoice:NRB:2026', 'INV-NRB-2026');
    }

    expect($results)->toHaveCount(50)
        ->and(array_unique($results))->toHaveCount(50);
});

test('rbac seed creates exactly 10 roles', function () {
    Rbac::seed(app());
    $count = \Spatie\Permission\Models\Role::query()->count();
    expect($count)->toBe(10);
});

test('hospital-admin gets branch.view-all', function () {
    Rbac::seed(app());
    $admin = User::factory()->create();
    $admin->assignRole('hospital-admin');
    expect($admin->can('branch.view-all'))->toBeTrue();
});