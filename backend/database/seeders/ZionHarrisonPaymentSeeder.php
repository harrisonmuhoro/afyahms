<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Billing\Models\Bill;
use App\Modules\Billing\Models\BillItem;
use App\Modules\Patients\Models\Patient;
use App\Modules\Queue\Models\Visit;
use App\Modules\Tenancy\Models\Branch;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Creates a small, repeatable M-Pesa payment fixture for the named test patient.
 * This seeder is intentionally not included in DatabaseSeeder; run it explicitly.
 */
final class ZionHarrisonPaymentSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            $branch = Branch::findByCode('NRB');

            if (! $branch) {
                throw new \RuntimeException('The NRB branch is required before seeding payment test data.');
            }

            $patient = Patient::withoutGlobalScopes()
                ->whereRaw('LOWER(first_name) = ?', ['zion'])
                ->whereRaw('LOWER(last_name) = ?', ['harrison'])
                ->first();

            if (! $patient) {
                $user = User::firstOrCreate(
                    ['email' => 'zion.harrison@example.local'],
                    [
                        'name' => 'Zion Harrison',
                        'phone' => '+254700000000',
                        'password' => Hash::make('ChangeMe!2025'),
                        'home_branch_id' => $branch->id,
                        'current_branch_id' => $branch->id,
                        'mfa_enabled' => false,
                    ],
                );
                $user->syncRoles(['patient']);

                DB::table('user_branch_access')->updateOrInsert(
                    ['user_id' => $user->id, 'branch_id' => $branch->id],
                    ['is_home' => true, 'granted_at' => now(), 'created_at' => now(), 'updated_at' => now()],
                );

                $patient = Patient::create([
                    'public_id' => (string) Str::uuid(),
                    'patient_number' => 'PAT-' . now()->format('Y') . '-ZION01',
                    'branch_id' => $branch->id,
                    'first_name' => 'Zion',
                    'last_name' => 'Harrison',
                    'gender' => 'unknown',
                    'date_of_birth' => '1995-01-01',
                    'phone' => '+254700000000',
                    'email' => 'zion.harrison@example.local',
                    'portal_user_id' => $user->id,
                    'is_active' => true,
                    'county' => 'Nairobi',
                ]);
            }

            if (! $patient->branch_id) {
                $patient->forceFill(['branch_id' => $branch->id])->save();
            }

            if (! $patient->portal_user_id) {
                $user = User::firstOrCreate(
                    ['email' => 'zion.harrison@example.local'],
                    [
                        'name' => 'Zion Harrison',
                        'phone' => '+254700000000',
                        'password' => Hash::make('ChangeMe!2025'),
                        'home_branch_id' => $branch->id,
                        'current_branch_id' => $branch->id,
                        'mfa_enabled' => false,
                    ],
                );
                $user->syncRoles(['patient']);

                DB::table('user_branch_access')->updateOrInsert(
                    ['user_id' => $user->id, 'branch_id' => $branch->id],
                    ['is_home' => true, 'granted_at' => now(), 'created_at' => now(), 'updated_at' => now()],
                );

                $patient->forceFill(['portal_user_id' => $user->id])->save();
            }

            if ($patient->portal_user_id) {
                $user = User::find($patient->portal_user_id);
                if ($user) {
                    $user->forceFill([
                        'home_branch_id' => $user->home_branch_id ?: $branch->id,
                        'current_branch_id' => $user->current_branch_id ?: $branch->id,
                    ])->save();
                    $user->syncRoles(['patient']);

                    DB::table('user_branch_access')->updateOrInsert(
                        ['user_id' => $user->id, 'branch_id' => $branch->id],
                        ['is_home' => true, 'granted_at' => now(), 'created_at' => now(), 'updated_at' => now()],
                    );
                }
            }

            $existingBill = Bill::withoutGlobalScopes()
                ->where('patient_id', $patient->id)
                ->whereIn('status', ['pending', 'partial'])
                ->where('notes', 'M-Pesa payment test fixture')
                ->first();

            if ($existingBill) {
                $this->command?->info("Existing payment test invoice: {$existingBill->public_id}");
                return;
            }

            $visit = Visit::withoutGlobalScopes()->create([
                'branch_id' => $branch->id,
                'patient_id' => $patient->id,
                'visit_date' => now()->toDateString(),
                'visit_type' => 'walk_in',
                'status' => 'open',
                'current_department' => 'BIL',
            ]);

            $bill = Bill::withoutGlobalScopes()->create([
                'branch_id' => $branch->id,
                'visit_id' => $visit->id,
                'patient_id' => $patient->id,
                'total_amount' => 10.00,
                'paid_amount' => 0.00,
                'status' => 'pending',
                'notes' => 'M-Pesa payment test fixture',
            ]);

            BillItem::create([
                'bill_id' => $bill->id,
                'description' => 'M-Pesa payment test service',
                'category' => 'service',
                'unit_price' => 10.00,
                'quantity' => 1,
                'total_price' => 10.00,
            ]);

            $this->command?->info("Created payment test invoice: {$bill->public_id}");
        });
    }
}
