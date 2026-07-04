<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /** @var array<int, string> */
    private array $selfProfilePermissions = [
        'profile.self.update.basic',
        'profile.self.update.contact',
        'profile.self.update.password',
        'profile.self.upload.photo',
    ];

    /** @var array<int, string> */
    private array $staffAdminPermissions = [
        'staff.update',
        'staff.role.assign',
    ];

    /** @var array<int, string> */
    private array $allRoles = [
        'superadmin',
        'hospital-admin',
        'doctor',
        'nurse',
        'receptionist',
        'records-officer',
        'pharmacist',
        'lab-technician',
        'radiologist',
        'cashier',
        'patient',
    ];

    public function up(): void
    {
        $now = now();
        $permissionIds = [];

        foreach (array_merge($this->selfProfilePermissions, $this->staffAdminPermissions) as $permission) {
            $existing = DB::table('permissions')
                ->where('name', $permission)
                ->where('guard_name', 'web')
                ->first();

            if ($existing === null) {
                $id = DB::table('permissions')->insertGetId([
                    'name' => $permission,
                    'guard_name' => 'web',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            } else {
                $id = $existing->id;
            }

            $permissionIds[$permission] = $id;
        }

        $this->grantPermissions($this->allRoles, $this->selfProfilePermissions, $permissionIds);
        $this->grantPermissions(['superadmin', 'hospital-admin'], $this->staffAdminPermissions, $permissionIds);

        if (class_exists(\Spatie\Permission\PermissionRegistrar::class)) {
            app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
        }
    }

    public function down(): void
    {
        $permissionIds = DB::table('permissions')
            ->whereIn('name', array_merge($this->selfProfilePermissions, $this->staffAdminPermissions))
            ->where('guard_name', 'web')
            ->pluck('id')
            ->all();

        if ($permissionIds === []) {
            return;
        }

        DB::table('role_has_permissions')
            ->whereIn('permission_id', $permissionIds)
            ->delete();

        if (class_exists(\Spatie\Permission\PermissionRegistrar::class)) {
            app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
        }
    }

    /**
     * @param array<int, string> $roles
     * @param array<int, string> $permissions
     * @param array<string, int> $permissionIds
     */
    private function grantPermissions(array $roles, array $permissions, array $permissionIds): void
    {
        $roleIds = DB::table('roles')
            ->whereIn('name', $roles)
            ->where('guard_name', 'web')
            ->pluck('id', 'name');

        foreach ($roleIds as $roleId) {
            foreach ($permissions as $permission) {
                DB::table('role_has_permissions')->updateOrInsert([
                    'role_id' => $roleId,
                    'permission_id' => $permissionIds[$permission],
                ]);
            }
        }
    }
};
