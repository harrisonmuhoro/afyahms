<?php

declare(strict_types=1);

namespace App\Modules\Admin\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Admin\Services\RolePermissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;

final class RolesController extends Controller
{
    public function __construct(private readonly RolePermissionService $service) {}

    public function index(): JsonResponse
    {
        return response()->json(['data' => $this->service->listRoles()]);
    }

    public function permissions(): JsonResponse
    {
        return response()->json(['data' => $this->service->listPermissions()]);
    }

    public function syncPermissions(Request $request, string $role): JsonResponse
    {
        $request->validate([
            'permissions' => ['required', 'array'],
            'permissions.*' => ['string'],
        ]);

        /** @var Role $role */
        $role = Role::findOrFail($role);
        $this->service->syncPermissions($role, $request->input('permissions'));

        return response()->json(['message' => 'Permissions updated.', 'role' => $role->fresh()]);
    }
}