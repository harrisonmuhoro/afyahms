<?php

declare(strict_types=1);

namespace App\Modules\Admin\Services;

use App\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * High-level role/permission operations.
 *
 * Used by the Admin controllers (users.assign-role, roles.assign-permission).
 * Spatie Permission is the underlying engine; this service is the only place
 * in app code that touches the Spatie models directly.
 */
final class RolePermissionService
{
    public function listRoles(): array
    {
        return Role::query()->with('permissions')->orderBy('name')->get()->toArray();
    }

    public function listPermissions(): array
    {
        return Permission::query()->orderBy('name')->get()->toArray();
    }

    public function assignRole(User $user, string $role): void
    {
        $user->assignRole($role);
    }

    public function revokeRole(User $user, string $role): void
    {
        $user->removeRole($role);
    }

    public function syncPermissions(Role $role, array $permissions): void
    {
        $role->syncPermissions($permissions);
    }

    public function syncUserRoles(User $user, array $roles): void
    {
        $user->syncRoles($roles);
    }
}