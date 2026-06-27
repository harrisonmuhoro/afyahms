<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Spatie\Permission\Models\Permission;

final class MirrorPermissionsToSanctum extends Command
{
    protected $signature = 'permissions:mirror-to-sanctum';
    protected $description = 'Mirror every web-guarded permission/role to the sanctum guard so Permission::findByName works for both.';

    public function handle(): int
    {
        foreach (Permission::where('guard_name', 'web')->get() as $perm) {
            Permission::firstOrCreate(
                ['name' => $perm->name, 'guard_name' => 'sanctum'],
                []
            );
            $this->line("  mirrored: {$perm->name}");
        }

        foreach (\Spatie\Permission\Models\Role::where('guard_name', 'web')->with('permissions')->get() as $role) {
            $mirror = \Spatie\Permission\Models\Role::firstOrCreate(
                ['name' => $role->name, 'guard_name' => 'sanctum'],
                []
            );
            $mirror->syncPermissions($role->permissions->pluck('name')->toArray());
            $this->line("  mirrored role: {$role->name}");
        }

        // Mirror each user's role assignments so `Auth::guard('sanctum')->user()`
        // can resolve the same permissions regardless of which guard Spatie picks.
        foreach (\App\Models\User::with('roles')->get() as $user) {
            foreach ($user->roles as $role) {
                if ($role->guard_name !== 'web') {
                    continue;
                }
                $user->assignRole(\Spatie\Permission\Models\Role::findByName($role->name, 'sanctum'));
                $this->line("  assigned user {$user->email} → {$role->name} (sanctum)");
            }
        }

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
        $this->info('Done.');

        return self::SUCCESS;
    }
}
