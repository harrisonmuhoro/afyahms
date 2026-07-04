<?php

declare(strict_types=1);

namespace App\Modules\Admin\Services;

use App\Models\User;
use App\Exceptions\Domain\ForbiddenException;
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
        $this->assertRoleCanBeManaged($role);

        $user->assignRole($role);
    }

    public function revokeRole(User $user, string $role): void
    {
        $this->assertRoleCanBeManaged($role);

        $user->removeRole($role);
    }

    public function syncPermissions(Role $role, array $permissions): void
    {
        if (! auth()->user()?->hasRole('superadmin')) {
            throw new ForbiddenException('Only Superadmin may modify role permission templates.');
        }

        $role->syncPermissions($permissions);
    }

    public function syncUserRoles(User $user, array $roles): void
    {
        foreach ($roles as $role) {
            $this->assertRoleCanBeManaged($role);
        }

        $user->syncRoles($roles);
    }

    private function assertRoleCanBeManaged(string $role): void
    {
        if (in_array($role, ['superadmin', 'hospital-admin'], true) && ! auth()->user()?->hasRole('superadmin')) {
            throw new ForbiddenException('Only Superadmin may assign or revoke Superadmin and Hospital Admin roles.');
        }
    }
}
