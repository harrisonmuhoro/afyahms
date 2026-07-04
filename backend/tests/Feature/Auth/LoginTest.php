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
    $user = \App\Models\User::factory()->create([
        'email' => 'dr@afya.local',
        'password' => \Illuminate\Support\Facades\Hash::make('ChangeMe!2025'),
        'home_branch_id' => $this->branch->id,
    ]);

    $auth = app(AuthService::class);
    $req = \Illuminate\Http\Request::create('/login', 'POST');

    expect(fn () => $auth->login('dr@afya.local', 'WrongPass2026!', $req))
        ->toThrow(\App\Exceptions\Domain\ForbiddenException::class);

    expect($user->fresh()->locked_until)->toBeNull()
        ->and($user->fresh()->failed_login_attempts)->toBe(1);
});

test('login locks account after repeated wrong passwords with friendly duration', function () {
    \App\Models\User::factory()->create([
        'email' => 'dr@afya.local',
        'password' => \Illuminate\Support\Facades\Hash::make('ChangeMe!2025'),
        'home_branch_id' => $this->branch->id,
    ]);

    config([
        'auth.login.max_attempts_per_minute' => 3,
        'auth.login.lockout_minutes' => 15,
    ]);

    $auth = app(AuthService::class);
    $req = \Illuminate\Http\Request::create('/login', 'POST');

    for ($i = 0; $i < 2; $i++) {
        try {
            $auth->login('dr@afya.local', 'WrongPass2026!', $req);
        } catch (\App\Exceptions\Domain\ForbiddenException) {
            //
        }
    }

    expect(fn () => $auth->login('dr@afya.local', 'WrongPass2026!', $req))
        ->toThrow(
            \App\Exceptions\Domain\ForbiddenException::class,
            'Your account is temporarily locked because there were too many incorrect password attempts. Try again in 15 minutes.',
        );
});

test('superadmin failed password attempts do not set account lockout', function () {
    $user = \App\Models\User::factory()->create([
        'email' => 'root@afya.local',
        'password' => \Illuminate\Support\Facades\Hash::make('ChangeMe!2025'),
        'home_branch_id' => $this->branch->id,
    ]);
    $user->assignRole('superadmin');

    config([
        'auth.login.max_attempts_per_minute' => 3,
        'auth.login.lockout_minutes' => 15,
    ]);

    $auth = app(AuthService::class);
    $req = \Illuminate\Http\Request::create('/login', 'POST');

    for ($i = 0; $i < 4; $i++) {
        try {
            $auth->login('root@afya.local', 'WrongPass2026!', $req);
        } catch (\App\Exceptions\Domain\ForbiddenException) {
            //
        }
    }

    expect($user->fresh()->locked_until)->toBeNull()
        ->and($user->fresh()->failed_login_attempts)->toBe(4);
});
