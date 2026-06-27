<?php

declare(strict_types=1);

namespace App\Modules\Admin\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Admin\Services\RolePermissionService;
use App\Modules\Auth\Resources\UserResource;
use App\Modules\Tenancy\Services\BranchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

final class UsersController extends Controller
{
    public function __construct(
        private readonly RolePermissionService $rbac,
        private readonly BranchService $branches,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $users = User::query()
            ->with(['roles', 'branches'])
            ->when($request->filled('q'), fn ($q) => $q->where(fn ($w) => $w
                ->where('name', 'like', "%{$request->string('q')}%")
                ->orWhere('email', 'like', "%{$request->string('q')}%")
                ->orWhere('phone', 'like', "%{$request->string('q')}%"),
            ))
            ->when($request->filled('role'), fn ($q) => $q->role($request->string('role')))
            ->orderBy('name')
            ->paginate(min(100, (int) $request->integer('per_page', 25)));

        return response()->json([
            'data' => UserResource::collection($users->getCollection())->resolve(),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page'    => $users->lastPage(),
                'per_page'     => $users->perPage(),
                'total'        => $users->total(),
            ],
        ]);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json(['user' => (new UserResource($user->load(['roles', 'branches'])))->resolve(request())]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => ['required', 'string', 'max:255'],
            'email'       => ['required', 'email', 'unique:users,email'],
            'phone'       => ['nullable', 'string', 'max:32'],
            'password'    => ['required', 'string', 'min:'.config('auth.password.min_length', 10)],
            'roles'       => ['required', 'array'],
            'roles.*'     => ['string', Rule::in(array_keys(\App\Modules\Admin\Rbac::ROLES))],
            'home_branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            'branch_ids'  => ['nullable', 'array'],
            'branch_ids.*'=> ['integer', 'exists:branches,id'],
        ]);

        $user = User::create([
            'name'      => $data['name'],
            'email'     => $data['email'],
            'phone'     => $data['phone'] ?? null,
            'password'  => $data['password'],
            'home_branch_id' => $data['home_branch_id'] ?? null,
        ]);

        $this->rbac->syncUserRoles($user, $data['roles']);

        foreach ($data['branch_ids'] ?? [] as $bid) {
            $branch = \App\Modules\Tenancy\Models\Branch::find($bid);
            if ($branch) {
                $this->branches->grantAccess($user, $branch, $bid === $data['home_branch_id']);
            }
        }

        return response()->json(['user' => (new UserResource($user->fresh()->load(['roles', 'branches'])))->resolve($request)], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name'     => ['sometimes', 'string', 'max:255'],
            'phone'    => ['nullable', 'string', 'max:32'],
            'roles'    => ['sometimes', 'array'],
            'roles.*'  => ['string', Rule::in(array_keys(\App\Modules\Admin\Rbac::ROLES))],
        ]);

        $user->fill(\Illuminate\Support\Arr::only($data, ['name', 'phone']));
        $user->save();

        if (isset($data['roles'])) {
            $this->rbac->syncUserRoles($user, $data['roles']);
        }

        return response()->json(['user' => (new UserResource($user->fresh()->load(['roles', 'branches'])))->resolve($request)]);
    }

    public function destroy(User $user): JsonResponse
    {
        $user->delete();

        return response()->json(['message' => 'User archived.']);
    }
}