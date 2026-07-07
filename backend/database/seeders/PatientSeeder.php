<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Patients\Models\Patient;
use App\Modules\Tenancy\Models\Branch;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

final class PatientSeeder extends Seeder
{
    public function run(): void
    {
        $branch = Branch::findByCode('NRB');
        if (!$branch) {
            return;
        }

        $faker = \Faker\Factory::create('en_KE'); // Use Kenyan locale for realistic names/phones

        $year = date('Y');
        $count = 20;

        DB::transaction(function () use ($faker, $branch, $year, $count) {
            for ($i = 0; $i < $count; $i++) {
                $gender = $faker->randomElement(['Male', 'Female']);
                $firstName = $gender === 'Male' ? $faker->firstNameMale : $faker->firstNameFemale;
                $lastName = $faker->lastName;
                
                // 1. Create the User (Patient Portal Account)
                $email = strtolower($firstName . '.' . $lastName . $faker->unique()->numberBetween(10, 999) . '@example.local');
                $phone = '+2547' . $faker->numberBetween(10000000, 99999999);
                
                $user = User::create([
                    'name' => $firstName . ' ' . $lastName,
                    'email' => $email,
                    'phone' => $phone,
                    'password' => Hash::make('ChangeMe!2025'),
                    'home_branch_id' => $branch->id,
                    'current_branch_id' => $branch->id,
                    'mfa_enabled' => false,
                ]);

                // Assign the 'patient' role
                $user->syncRoles(['patient']);

                // Grant branch access
                DB::table('user_branch_access')->updateOrInsert(
                    ['user_id' => $user->id, 'branch_id' => $branch->id],
                    ['is_home' => true, 'granted_at' => now(), 'created_at' => now(), 'updated_at' => now()],
                );

                // 2. Create the Patient Record
                $patient = Patient::create([
                    'public_id' => Str::uuid()->toString(),
                    'patient_number' => 'PAT-' . $year . '-' . str_pad((string)($i + 1), 6, '0', STR_PAD_LEFT),
                    'branch_id' => $branch->id,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'gender' => $gender,
                    'date_of_birth' => $faker->dateTimeBetween('-80 years', '-1 year')->format('Y-m-d'),
                    'phone' => $phone,
                    'email' => $email,
                    'portal_user_id' => $user->id,
                    'is_active' => true,
                    'national_id' => (string)$faker->numberBetween(10000000, 40000000),
                    'marital_status' => $faker->randomElement(['Single', 'Married', 'Divorced', 'Widowed']),
                    'blood_group' => $faker->randomElement(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
                    'address' => $faker->address,
                    'county' => 'Nairobi',
                ]);
            }

            // Keep the patient-number sequence in step with the rows we just
            // inserted. SequenceService::next() returns the stored value + 1,
            // so storing `value = $count` makes the next real allocation
            // ("PAT-{year}-000021") skip past the seeded records instead of
            // colliding with them. Never lower an already-higher counter.
            $scope = "patient:{$year}";
            $current = (int) (DB::table('sequences')->where('scope', $scope)->value('value') ?? 0);
            DB::table('sequences')->updateOrInsert(
                ['scope' => $scope],
                ['value' => max($current, $count), 'updated_at' => now(), 'created_at' => now()],
            );
        });
    }
}
