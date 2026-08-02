<?php

declare(strict_types=1);

namespace App\Modules\Auth\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Auth\Requests\ChangePasswordRequest;
use App\Modules\Auth\Requests\LoginRequest;
use App\Modules\Auth\Requests\MfaConfirmRequest;
use App\Modules\Auth\Requests\MfaDisableRequest;
use App\Modules\Auth\Requests\MfaEnrollVerifyRequest;
use App\Modules\Auth\Requests\SwitchBranchRequest;
use App\Modules\Auth\Requests\UpdatePreferencesRequest;
use App\Modules\Auth\Resources\UserResource;
use App\Modules\Auth\Services\AuthService;
use App\Modules\Auth\Services\MfaService;
use App\Modules\Audit\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

final class AuthController extends Controller
{
    public function __construct(
        private readonly AuthService $auth,
        private readonly MfaService $mfa,
        private readonly AuditLogService $audit,
    ) {}

    private const USER_RESOURCE_RELATIONS = [
        'roles',
        'roles.permissions',
        'permissions',
        'branches',
        'homeBranch',
        'currentBranch',
        'currentStation',
    ];

    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->auth->login(
            email: $request->string('email')->lower()->toString(),
            password: $request->string('password')->toString(),
            request: $request,
        );

        return response()->json([
            'token'                   => $result['token'],
            'requires_mfa'            => $result['requires_mfa'],
            'mfa_type'                => $result['mfa_type'] ?? null,
            'requires_mfa_enrollment' => $result['requires_mfa_enrollment'],
            'user'                    => (new UserResource($result['user']->load(self::USER_RESOURCE_RELATIONS)))->toArray($request),
            'role'                    => $result['user']->roles->first()?->name,
            'profile_complete'        => (bool) $result['user']->profile_complete,
            'home_branch_id'          => $result['user']->home_branch_id,
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => (new UserResource($request->user()->load(self::USER_RESOURCE_RELATIONS)))->toArray($request),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->auth->logout($request->user());

        return response()->json(['message' => 'Logged out.']);
    }

    public function switchBranch(SwitchBranchRequest $request): JsonResponse
    {
        $user = $this->auth->switchBranch(
            user: $request->user(),
            branchId: (int) $request->integer('branch_id'),
        );

        return response()->json([
            'user' => (new UserResource($user->fresh(self::USER_RESOURCE_RELATIONS)))->toArray($request),
        ]);
    }

    public function updatePreferences(UpdatePreferencesRequest $request): JsonResponse
    {
        $user = $request->user();

        $user->forceFill($request->safe()->only(['locale', 'theme']))->save();

        return response()->json([
            'user' => (new UserResource($user->fresh(self::USER_RESOURCE_RELATIONS)))->toArray($request),
        ]);
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! Hash::check(
            $request->string('current_password')->toString(),
            $user->password,
        )) {
            return response()->json([
                'error' => [
                    'type'    => 'InvalidCurrentPassword',
                    'status'  => 422,
                    'message' => 'Current password is incorrect.',
                ],
            ], 422);
        }

        $user->forceFill([
            'password'         => $request->string('password')->toString(),
            'password_changed_at' => now(),
        ])->save();

        $currentToken = $user->currentAccessToken();
        $user->tokens()
            ->when($currentToken !== null, fn ($query) => $query->whereKeyNot($currentToken->id))
            ->delete();

        $currentSessionId = $request->hasSession() ? $request->session()->getId() : null;
        DB::table('sessions')
            ->where('user_id', $user->id)
            ->when($currentSessionId !== null, fn ($query) => $query->where('id', '!=', $currentSessionId))
            ->delete();

        $this->audit->record(
            event: 'user.password_changed',
            actor: $user,
            request: $request,
            subject: $user,
            context: [
                'action' => 'password_changed',
                'invalidated_other_sessions' => true,
            ],
        );

        return response()->json(['message' => 'Password updated.']);
    }

    // ---------------------------- MFA ----------------------------

    public function mfaEnroll(Request $request): JsonResponse
    {
        $user = $request->user();
        $type = $request->string('type')->toString() ?: 'totp';
        $payload = $this->mfa->beginEnrollment($user, $type);

        $this->audit->record(
            event: 'user.mfa_enrollment_started',
            actor: $user,
            request: $request,
            subject: $user,
            context: [
                'action' => 'mfa_enrollment_started',
                'type' => $type,
            ],
        );

        return response()->json([
            'secret'         => $payload['secret'],
            'qr_url'         => $payload['qr_url'],
            'recovery_codes' => $payload['recovery_codes'],
            'message'        => $type === 'email' ? 'An OTP has been sent to your email.' : 'Scan the QR code in your authenticator app, then verify.',
        ]);
    }

    public function mfaEnrollVerify(MfaEnrollVerifyRequest $request): JsonResponse
    {
        $this->mfa->confirmEnrollment(
            user: $request->user(),
            code: $request->string('code')->toString(),
        );

        $this->audit->record(
            event: 'user.mfa_enabled',
            actor: $request->user(),
            request: $request,
            subject: $request->user(),
            context: [
                'action' => 'mfa_enabled',
                'field_name' => 'mfa_enabled',
                'old_value' => false,
                'new_value' => true,
            ],
        );

        return response()->json(['message' => 'MFA enabled.']);
    }

    public function mfaConfirm(MfaConfirmRequest $request): JsonResponse
    {
        $this->auth->confirmMfa(
            user: $request->user(),
            code: (string) $request->input('code'),
            isRecovery: $request->filled('recovery'),
            request: $request,
        );

        return response()->json(['message' => 'MFA confirmed.']);
    }

    public function mfaDisable(MfaDisableRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! Hash::check(
            $request->string('current_password')->toString(),
            $user->password,
        )) {
            return response()->json([
                'error' => [
                    'type'    => 'InvalidCurrentPassword',
                    'status'  => 422,
                    'message' => 'Current password is incorrect.',
                ],
            ], 422);
        }

        $wasEnabled = (bool) $user->mfa_enabled;
        $this->mfa->disable($user);

        $this->audit->record(
            event: 'user.mfa_disabled',
            actor: $user,
            request: $request,
            subject: $user,
            context: [
                'action' => 'mfa_disabled',
                'field_name' => 'mfa_enabled',
                'old_value' => $wasEnabled,
                'new_value' => false,
            ],
        );

        return response()->json(['message' => 'MFA disabled.']);
    }
}
