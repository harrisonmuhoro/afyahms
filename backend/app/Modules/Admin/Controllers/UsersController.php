<?php

declare(strict_types=1);

namespace App\Modules\Admin\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Audit\Services\AuditLogService;
use App\Modules\Admin\Services\RolePermissionService;
use App\Modules\Admin\Services\UserAccountService;
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
        private readonly UserAccountService $accounts,
        private readonly AuditLogService $audit,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();

        $users = User::query()
            ->with(['roles', 'branches'])
            ->when(! $actor?->hasRole('superadmin'), fn ($q) => $q->whereDoesntHave('roles', fn ($r) => $r->where('name', 'superadmin')))
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
        $this->accounts->assertCanView(request()->user(), $user);

        return response()->json(['user' => (new UserResource($user->load(['roles', 'branches'])))->resolve(request())]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => ['required', 'string', 'max:255'],
            'email'       => ['required', 'email', 'unique:users,email'],
            'phone'       => ['nullable', 'string', 'max:32'],
            'password'    => ['required', 'string', 'min:'.config('auth.password.min_length', 12)],
            'roles'       => ['required', 'array'],
            'roles.*'     => ['string', Rule::in(array_keys(\App\Modules\Admin\Rbac::ROLES))],
            'home_branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            'branch_ids'  => ['nullable', 'array'],
            'branch_ids.*'=> ['integer', 'exists:branches,id'],
        ]);

        $this->accounts->assertAssignableRoles($request->user(), $data['roles']);

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

        $this->audit->record(
            event: 'user.created',
            actor: $request->user(),
            request: $request,
            subject: $user,
            context: [
                'action' => 'created',
                'roles' => $data['roles'],
                'home_branch_id' => $data['home_branch_id'] ?? null,
                'branch_ids' => $data['branch_ids'] ?? [],
            ],
        );

        // Notify superadmins
        $superadmins = User::role('superadmin')->get();
        if ($superadmins->isNotEmpty()) {
            \Illuminate\Support\Facades\Notification::send($superadmins, new \App\Notifications\NewStaffAdded($user));
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

        if (isset($data['roles'])) {
            $this->accounts->assertCanChangeRoles($request->user(), $user, $data['roles']);
        } elseif ($request->user()->id !== $user->id) {
            $this->accounts->assertCanManage($request->user(), $user);
        }

        $before = $user->only(['name', 'phone']);
        $previousRoles = $user->getRoleNames()->all();
        $user->fill(\Illuminate\Support\Arr::only($data, ['name', 'phone']));
        $user->save();
        $after = $user->fresh()->only(['name', 'phone']);

        $this->audit->recordFieldChanges(
            event: 'user.updated',
            actor: $request->user(),
            request: $request,
            subject: $user,
            before: $before,
            after: $after,
            context: ['action' => 'updated'],
        );

        if (isset($data['roles'])) {
            $this->rbac->syncUserRoles($user, $data['roles']);

            $this->audit->record(
                event: 'user.roles_changed',
                actor: $request->user(),
                request: $request,
                subject: $user,
                context: [
                    'action' => 'roles_changed',
                    'old_value' => $previousRoles,
                    'new_value' => $data['roles'],
                ],
            );
        }

        return response()->json(['user' => (new UserResource($user->fresh()->load(['roles', 'branches'])))->resolve($request)]);
    }

    public function destroy(User $user): JsonResponse
    {
        abort(405, 'Use account deactivation instead of deleting users.');

        return response()->json(['message' => 'Use account deactivation instead of deleting users.'], 405);
    }

    public function deactivate(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:2000'],
        ]);

        $updated = $this->accounts->deactivate($request->user(), $user, $data['reason'], $request);

        return response()->json([
            'message' => 'User deactivated.',
            'user' => (new UserResource($updated))->resolve($request),
        ]);
    }

    public function reactivate(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:2000'],
        ]);

        $updated = $this->accounts->reactivate($request->user(), $user, $data['reason'], $request);

        return response()->json([
            'message' => 'User reactivated.',
            'user' => (new UserResource($updated))->resolve($request),
        ]);
    }
}
