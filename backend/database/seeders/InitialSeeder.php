<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Admin\Rbac;
use App\Modules\Tenancy\Models\Branch;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\PermissionRegistrar;

/**
 * Idempotent Phase-0 seeder:
 *   - Branches: default NRB (Nairobi HQ)
 *   - Superadmin + hospital roles + full permission matrix
 *   - Default superadmin and hospital-admin users
 *   - One user per remaining role for local testing
 */
final class InitialSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $this->seedBranches();
            $this->seedRbac();
            $this->seedUsers();
        });

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    private function seedBranches(): void
    {
        Branch::query()->updateOrCreate(
            ['code' => 'NRB'],
            [
                'name'    => 'Nairobi (HQ)',
                'address' => 'Nairobi, Kenya',
                'phone'   => '+254 700 000 000',
                'email'   => 'info@afya.local',
                'timezone'=> 'Africa/Nairobi',
                'currency'=> 'KES',
                'is_active' => true,
            ],
        );
    }

    private function seedRbac(): void
    {
        Rbac::seed(app());
    }

    private function seedUsers(): void
    {
        $branch = Branch::findByCode('NRB');

        // Superadmin: system/root role, not for daily hospital operations.
        $superadmin = User::updateOrCreate(
            ['email' => 'superadmin@afya.local'],
            [
                'name'       => 'Superadmin',
                'phone'      => '+254700000000',
                'password'   => Hash::make('ChangeMe!2025'),
                'home_branch_id' => $branch->id,
                'current_branch_id' => $branch->id,
                'is_active' => true,
                'mfa_enabled' => false,
            ],
        );
        $superadmin->syncRoles(['superadmin']);
        DB::table('user_branch_access')->updateOrInsert(
            ['user_id' => $superadmin->id, 'branch_id' => $branch->id],
            ['is_home' => true, 'granted_at' => now(), 'created_at' => now(), 'updated_at' => now()],
        );

        // Hospital Admin: operational hospital administrator.
        $admin = User::updateOrCreate(
            ['email' => 'admin@afya.local'],
            [
                'name'       => 'Hospital Administrator',
                'phone'      => '+254700000001',
                'password'   => Hash::make('ChangeMe!2025'),
                'home_branch_id' => $branch->id,
                'current_branch_id' => $branch->id,
                'is_active' => true,
            ],
        );
        $admin->syncRoles(['hospital-admin']);
        DB::table('user_branch_access')->updateOrInsert(
            ['user_id' => $admin->id, 'branch_id' => $branch->id],
            ['is_home' => true, 'granted_at' => now(), 'created_at' => now(), 'updated_at' => now()],
        );

        // One user per remaining role (for local testing)
        $samples = [
            ['doctor@afya.local',          'Dr. Test Doctor',          'doctor',         false],
            ['nurse@afya.local',           'Nurse Test',               'nurse',          false],
            ['receptionist@afya.local',    'Reception Test',           'receptionist',   false],
            ['records@afya.local',         'Records Officer',          'records-officer',false],
            ['pharmacist@afya.local',      'Pharm Test',               'pharmacist',     true],
            ['lab@afya.local',             'Lab Tech',                 'lab-technician', false],
            ['radiologist@afya.local',     'Dr. Rad',                  'radiologist',    false],
            ['cashier@afya.local',         'Cashier Test',             'cashier',        false],
        ];

        foreach ($samples as [$email, $name, $role, $mfa]) {
            $user = User::updateOrCreate(
                ['email' => $email],
                [
                    'name'      => $name,
                    'phone'     => '+254700000'.random_int(100, 999),
                    'password'  => Hash::make('ChangeMe!2025'),
                    'home_branch_id'    => $branch->id,
                    'current_branch_id' => $branch->id,
                    'mfa_enabled'       => $mfa,        // forced enrollable but not yet confirmed
                ],
            );
            $user->syncRoles([$role]);
            DB::table('user_branch_access')->updateOrInsert(
                ['user_id' => $user->id, 'branch_id' => $branch->id],
                ['is_home' => true, 'granted_at' => now(), 'created_at' => now(), 'updated_at' => now()],
            );
        }
    }
}
