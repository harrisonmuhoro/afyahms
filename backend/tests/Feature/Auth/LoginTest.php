<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\Admin\Rbac;
use App\Modules\Auth\Services\AuthService;
use App\Modules\Tenancy\Models\Branch;
use Tests\TestCase;

beforeEach(function () {
    $this->artisan('migrate:fresh');
    $this->branch = Branch::create([
        'code' => 'NRB', 'name' => 'Nairobi', 'is_active' => true,
    ]);
    app()->instance('active_branch_id', $this->branch->id);
    Rbac::seed(app());
});

test('login returns token + user', function () {
    \App\Models\User::factory()->create([
        'email' => 'dr@afya.local',
        'password' => \Illuminate\Support\Facades\Hash::make('ChangeMe!2025'),
        'home_branch_id' => $this->branch->id,
    ])->assignRole('doctor');

    $auth = app(AuthService::class);
    $req = \Illuminate\Http\Request::create('/login', 'POST');

    $result = $auth->login('dr@afya.local', 'ChangeMe!2025', $req);

    expect($result['user'])->toBeInstanceOf(User::class)
        ->and($result['token'])->toBeString()
        ->and($result['requires_mfa'])->toBeBool();
});

test('login fails with wrong password', function () {
    \App\Models\User::factory()->create([
        'email' => 'dr@afya.local',
        'password' => \Illuminate\Support\Facades\Hash::make('ChangeMe!2025'),
        'home_branch_id' => $this->branch->id,
    ]);

    $auth = app(AuthService::class);
    $req = \Illuminate\Http\Request::create('/login', 'POST');

    expect(fn () => $auth->login('dr@afya.local', 'wrong', $req))
        ->toThrow(\App\Exceptions\Domain\ForbiddenException::class);
});