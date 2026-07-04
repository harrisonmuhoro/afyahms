<?php

declare(strict_types=1);

namespace App\Modules\Admin\Controllers;

use App\Exceptions\Domain\ForbiddenException;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Admin\Rbac;
use App\Modules\Admin\Services\RolePermissionService;
use App\Modules\Admin\Services\UserAccountService;
use App\Modules\Audit\Services\AuditLogService;
use App\Modules\Auth\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Mail;
use App\Services\OtpService;

final class StaffAdminController extends Controller
{
    private const USER_RESOURCE_RELATIONS = [
        'roles',
        'roles.permissions',
        'permissions',
        'branches',
        'homeBranch',
        'currentBranch',
        'currentStation',
    ];

    private const STAFF_ROLES = [
        'doctor',
        'nurse',
        'receptionist',
        'records-officer',
        'pharmacist',
        'lab-technician',
        'radiologist',
        'cashier',
    ];

    public function __construct(
        private readonly UserAccountService $accounts,
        private readonly RolePermissionService $roles,
        private readonly AuditLogService $audit,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();

        $users = User::query()
            ->with(self::USER_RESOURCE_RELATIONS)
            ->whereDoesntHave('roles', fn ($q) => $q->where('name', 'patient'))
            ->when(! $actor?->hasRole('superadmin'), fn ($q) => $q
                ->whereDoesntHave('roles', fn ($r) => $r->whereIn('name', ['superadmin', 'hospital-admin']))
                ->where(function ($branch) use ($actor): void {
                    $active = $actor?->current_branch_id ?? $actor?->home_branch_id;
                    $branch->where('home_branch_id', $active)
                        ->orWhere('current_branch_id', $active)
                        ->orWhereHas('branches', fn ($b) => $b->where('branches.id', $active));
                }))
            ->when($request->filled('q'), fn ($q) => $q->where(fn ($w) => $w
                ->where('name', 'like', "%{$request->string('q')}%")
                ->orWhere('email', 'like', "%{$request->string('q')}%")
                ->orWhere('phone', 'like', "%{$request->string('q')}%")
                ->orWhere('staff_id', 'like', "%{$request->string('q')}%")
                ->orWhere('department', 'like', "%{$request->string('q')}%"),
            ))
            ->orderBy('name')
            ->paginate(min(100, (int) $request->integer('per_page', 25)));

        return response()->json([
            'data' => UserResource::collection($users->getCollection())->resolve($request),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $request->user();
        if (!$actor->hasRole('superadmin') && !$actor->hasRole('hospital-admin')) {
            throw new ForbiddenException('Only administrators can create staff.');
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:255', 'unique:users,phone'],
            'role' => ['required', 'string', Rule::in(self::STAFF_ROLES)],
            'home_branch_id' => ['required', 'integer', 'exists:branches,id'],
        ]);

        $activeBranch = $actor->current_branch_id ?? $actor->home_branch_id;
        if (!$actor->hasRole('superadmin') && $data['home_branch_id'] != $activeBranch) {
            throw new ForbiddenException('You can only create staff in your active branch.');
        }

        $password = Str::random(12);

        $user = DB::transaction(function () use ($data, $password) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'password' => Hash::make($password),
                'home_branch_id' => $data['home_branch_id'],
            ]);

            $user->assignRole($data['role']);

            $user->branches()->attach($data['home_branch_id'], ['is_home' => true, 'granted_at' => now()]);

            $this->syncRoleProfiles($user);

            return $user;
        });

        // In a real app, send email with password.
        // Mail::to($user->email)->send(new StaffCreatedMail($user, $password));

        $this->audit->record(
            event: 'staff.created',
            actor: $actor,
            request: $request,
            subject: $user,
            context: ['role' => $data['role'], 'home_branch_id' => $data['home_branch_id']],
        );

        return response()->json([
            'message' => 'Staff created successfully. Temporary password: ' . $password,
            'user' => (new UserResource($user->fresh(self::USER_RESOURCE_RELATIONS)))->resolve($request),
        ], 201);
    }

    public function show(Request $request, User $user): JsonResponse
    {
        $this->assertCanManageStaff($request->user(), $user, viewOnly: true);

        return response()->json([
            'user' => (new UserResource($user->load(self::USER_RESOURCE_RELATIONS)))->resolve($request),
        ]);
    }

    public function updateEmployment(Request $request, User $user): JsonResponse
    {
        $this->assertCanManageStaff($request->user(), $user);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'national_id' => ['sometimes', 'nullable', 'string', 'min:6', 'max:9'],
            'date_of_birth' => ['sometimes', 'nullable', 'date', 'before:today'],
            'staff_id' => ['sometimes', 'nullable', 'string', 'max:80', Rule::unique('users', 'staff_id')->ignore($user->id)],
            'department' => ['sometimes', 'nullable', 'string', 'max:120'],
            'specialization' => ['sometimes', 'nullable', 'string', 'max:120'],
            'license_number' => ['sometimes', 'nullable', 'string', 'max:120'],
            'employment_type' => ['sometimes', 'nullable', Rule::in(['full_time', 'part_time', 'locum', 'contract'])],
            'employment_start_date' => ['sometimes', 'nullable', 'date'],
            'role' => ['prohibited'],
            'roles' => ['prohibited'],
            'account_status' => ['prohibited'],
            'email' => ['prohibited'],
            'phone' => ['prohibited'],
            'password' => ['prohibited'],
            'salary' => ['prohibited'],
        ], [
            '*.prohibited' => 'This field is managed by a separate administrative workflow.',
        ]);

        $fields = [
            'name',
            'national_id',
            'date_of_birth',
            'staff_id',
            'department',
            'specialization',
            'license_number',
            'employment_type',
            'employment_start_date',
        ];
        $payload = array_intersect_key($data, array_flip($fields));
        $before = $user->only(array_keys($payload));
        $user->forceFill($payload)->save();
        $updated = $user->fresh(self::USER_RESOURCE_RELATIONS);

        $this->audit->recordFieldChanges(
            event: 'staff.employment.updated',
            actor: $request->user(),
            request: $request,
            subject: $updated,
            before: $before,
            after: $payload,
            context: ['action' => $request->user()->hasRole('superadmin') ? 'superadmin_updated' : 'admin_updated'],
        );

        foreach (['national_id', 'date_of_birth'] as $field) {
            if (array_key_exists($field, $payload) && (($before[$field] ?? null) != $payload[$field])) {
                $this->audit->record(
                    event: 'staff.sensitive_field_updated',
                    actor: $request->user(),
                    request: $request,
                    subject: $updated,
                    context: [
                        'action' => 'sensitive_field_updated',
                        'field_name' => $field,
                        'old_value' => $field === 'national_id' ? $this->maskSensitive($before[$field] ?? null) : ($before[$field] ?? null),
                        'new_value' => $field === 'national_id' ? $this->maskSensitive($payload[$field] ?? null) : ($payload[$field] ?? null),
                    ],
                );
            }
        }

        return response()->json(['user' => (new UserResource($updated))->resolve($request)]);
    }

    public function updateRole(Request $request, User $user): JsonResponse
    {
        $this->assertCanManageStaff($request->user(), $user);

        $data = $request->validate([
            'role' => ['required', Rule::in(self::STAFF_ROLES)],
            'reason' => ['required', 'string', 'min:5', 'max:500'],
        ]);

        $previous = $user->getRoleNames()->all();
        $this->accounts->assertCanChangeRoles($request->user(), $user, [$data['role']]);

        DB::transaction(function () use ($user, $data, $request, $previous): void {
            $this->roles->syncUserRoles($user, [$data['role']]);
            $user->tokens()->delete();
            DB::table('sessions')->where('user_id', $user->id)->delete();

            $this->audit->record(
                event: 'staff.role_changed',
                actor: $request->user(),
                request: $request,
                subject: $user,
                context: [
                    'action' => 'role_changed',
                    'old_value' => $previous,
                    'new_value' => [$data['role']],
                    'reason' => $data['reason'],
                    'sessions_revoked' => true,
                ],
            );
        });

        return response()->json([
            'message' => 'Staff role updated and active sessions revoked.',
            'user' => (new UserResource($user->fresh(self::USER_RESOURCE_RELATIONS)))->resolve($request),
        ]);
    }

    public function triggerPasswordReset(Request $request, User $user, OtpService $otpService): JsonResponse
    {
        $this->assertCanManageStaff($request->user(), $user);

        $mfaType = $user->mfa_enabled ? $user->activeMfa()?->type : null;
        
        if ($mfaType === 'email') {
            $otpService->send($user, $user->email, 'password_reset_mfa');
            $status = 'otp_sent_mfa';
        } elseif (! $user->mfa_enabled) {
            $otpService->send($user, $user->email, 'password_reset');
            $status = 'otp_sent';
        } else {
            return response()->json([
                'message' => 'User has Authenticator App enabled. They must initiate the reset themselves from the login page.',
                'status' => 'totp_mfa_enabled'
            ], 400);
        }

        $this->audit->record(
            event: 'staff.password_reset_triggered',
            actor: $request->user(),
            request: $request,
            subject: $user,
            context: [
                'action' => 'password_reset_triggered',
                'status' => $status,
            ],
        );

        return response()->json([
            'message' => 'Password reset code has been sent to the user.',
            'status' => $status,
        ]);
    }

    private function assertCanManageStaff(User $actor, User $target, bool $viewOnly = false): void
    {
        if ($target->hasRole('patient')) {
            throw new ForbiddenException('Patient accounts are not managed through the staff panel.');
        }

        if ($viewOnly) {
            $this->accounts->assertCanView($actor, $target);
        } else {
            $this->accounts->assertCanManage($actor, $target);
        }

        if ($actor->hasRole('superadmin')) {
            return;
        }

        $activeBranch = $actor->current_branch_id ?? $actor->home_branch_id;
        $targetBranches = $target->branches()->pluck('branches.id')->map(fn ($id) => (int) $id)->all();
        $targetBranchIds = array_filter([
            $target->home_branch_id !== null ? (int) $target->home_branch_id : null,
            $target->current_branch_id !== null ? (int) $target->current_branch_id : null,
            ...$targetBranches,
        ]);

        if ($activeBranch === null || ! in_array((int) $activeBranch, $targetBranchIds, true)) {
            throw new ForbiddenException('Hospital Admin can manage staff only in their active branch.');
        }
    }

    private function maskSensitive(mixed $value): ?string
    {
        $value = (string) $value;
        if ($value === '') {
            return null;
        }

        return str_repeat('*', max(0, strlen($value) - 4)).substr($value, -4);
    }

    public function updateBranches(Request $request, User $user): JsonResponse
    {
        $this->assertCanManageStaff($request->user(), $user);

        $data = $request->validate([
            'branch_ids' => ['required', 'array'],
            'branch_ids.*' => ['integer', 'exists:branches,id'],
            'home_branch_id' => ['required', 'integer', Rule::in($request->input('branch_ids', []))],
        ]);

        $actor = $request->user();
        $activeBranch = $actor->current_branch_id ?? $actor->home_branch_id;
        if (!$actor->hasRole('superadmin') && !in_array($activeBranch, $data['branch_ids'])) {
            throw new ForbiddenException('You cannot remove the user from your active branch.');
        }

        DB::transaction(function () use ($user, $data) {
            $user->home_branch_id = $data['home_branch_id'];
            if (!in_array($user->current_branch_id, $data['branch_ids'])) {
                $user->current_branch_id = $data['home_branch_id'];
            }
            $user->save();

            $syncData = [];
            foreach ($data['branch_ids'] as $id) {
                $syncData[$id] = ['is_home' => ($id == $data['home_branch_id']), 'granted_at' => now()];
            }
            $user->branches()->sync($syncData);

            $this->syncRoleProfiles($user);
        });

        $this->audit->record(
            event: 'staff.branches.updated',
            actor: $request->user(),
            request: $request,
            subject: $user,
            context: ['branches' => $data['branch_ids'], 'home_branch' => $data['home_branch_id']],
        );

        return response()->json([
            'message' => 'Staff branches updated successfully.',
            'user' => (new UserResource($user->fresh(self::USER_RESOURCE_RELATIONS)))->resolve($request),
        ]);
    }

    private function syncRoleProfiles(User $user): void
    {
        $branchIds = $user->branches()->pluck('branches.id')->toArray();
        $roles = $user->roles()->pluck('name')->toArray();

        // Map roles to relationship names
        $roleMap = [
            'doctor' => 'doctorProfiles',
            'nurse' => 'nurseProfiles',
            'receptionist' => 'receptionistProfiles',
            'records-officer' => 'recordsOfficerProfiles',
            'pharmacist' => 'pharmacistProfiles',
            'lab-technician' => 'labTechnicianProfiles',
            'radiologist' => 'radiologistProfiles',
            'cashier' => 'cashierProfiles',
        ];

        foreach ($roleMap as $role => $relation) {
            if (in_array($role, $roles)) {
                // User has this role, ensure a profile exists for each assigned branch
                $existing = $user->$relation()->pluck('branch_id')->toArray();
                $toAdd = array_diff($branchIds, $existing);
                $toRemove = array_diff($existing, $branchIds);

                if (!empty($toRemove)) {
                    $user->$relation()->whereIn('branch_id', $toRemove)->delete();
                }

                foreach ($toAdd as $branchId) {
                    $user->$relation()->create(['branch_id' => $branchId]);
                }
            } else {
                // User doesn't have this role, clear any stranded profiles
                $user->$relation()->delete();
            }
        }
    }
}
