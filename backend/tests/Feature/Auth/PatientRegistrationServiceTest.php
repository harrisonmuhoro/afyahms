<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\Admin\Rbac;
use App\Modules\Patients\Models\Patient;
use App\Services\Auth\PatientRegistrationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Rbac::seed(app());
    Carbon::setTestNow(Carbon::parse('2026-07-04 10:00:00'));
});

afterEach(function (): void {
    Carbon::setTestNow();
});

test('google patient registration assigns permanent patient number', function (): void {
    $googleUser = new class
    {
        public function getName(): string
        {
            return 'Jane Mary Patient';
        }

        public function getEmail(): string
        {
            return 'jane.patient@example.test';
        }

        public function getId(): string
        {
            return 'google-user-123';
        }

        public function getAvatar(): string
        {
            return 'https://example.test/avatar.jpg';
        }
    };

    $user = app(PatientRegistrationService::class)->registerFromGoogle($googleUser);

    expect($user)->toBeInstanceOf(User::class)
        ->and($user->hasRole('patient'))->toBeTrue()
        ->and($user->patient)->toBeInstanceOf(Patient::class)
        ->and($user->patient->patient_number)->toBe('PAT-2026-000001')
        ->and($user->patient->portal_user_id)->toBe($user->id)
        ->and($user->patient->first_name)->toBe('Jane')
        ->and($user->patient->middle_name)->toBe('Mary')
        ->and($user->patient->last_name)->toBe('Patient');
});
