<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Models\User;
use App\Modules\Patients\Models\Patient;
use App\Support\Sequences\SequenceService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class PatientRegistrationService
{
    public function __construct(
        private readonly SequenceService $sequences
    ) {}

    /**
     * Handle the registration of a new patient via Google.
     */
    public function registerFromGoogle($googleUser): User
    {
        return DB::transaction(function () use ($googleUser) {
            // 1. Create User
            $user = User::create([
                'name' => $googleUser->getName(),
                'email' => $googleUser->getEmail(),
                'google_id' => $googleUser->getId(),
                'profile_photo_path' => $googleUser->getAvatar(),
                'profile_complete' => false,
                'is_active' => true,
            ]);

            // 2. Assign Patient Role
            $user->assignRole('patient');

            // 3. Create stub patient record
            $nameParts = explode(' ', $googleUser->getName() ?? '');
            $firstName = array_shift($nameParts) ?: 'Unknown';
            $lastName = array_pop($nameParts) ?: 'Unknown';
            $middleName = implode(' ', $nameParts) ?: null;

            if ($lastName === 'Unknown' && $firstName !== 'Unknown') {
                $lastName = $firstName;
            }

            $year = Carbon::now()->year;

            $patient = new Patient([
                'patient_number' => $this->sequences->next(
                    scope: "patient:{$year}",
                    prefix: "PAT-{$year}",
                    digits: 6,
                ),
                'first_name' => $firstName,
                'middle_name' => $middleName,
                'last_name' => $lastName,
                'email' => $googleUser->getEmail(),
            ]);

            $patient->portal_user_id = $user->id;
            $patient->save();

            // 4. Fire Event
            // if (class_exists(PatientRegistered::class)) {
            //     event(new PatientRegistered($user));
            // }

            return $user;
        });
    }
}
