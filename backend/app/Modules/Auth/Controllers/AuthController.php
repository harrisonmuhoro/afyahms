<?php

declare(strict_types=1);

namespace App\Modules\Auth\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Auth\Requests\ChangePasswordRequest;
use App\Modules\Auth\Requests\LoginRequest;
use App\Modules\Auth\Requests\MfaConfirmRequest;
use App\Modules\Auth\Requests\MfaEnrollVerifyRequest;
use App\Modules\Auth\Requests\SwitchBranchRequest;
use App\Modules\Auth\Resources\UserResource;
use App\Modules\Auth\Services\AuthService;
use App\Modules\Auth\Services\MfaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AuthController extends Controller
{
    public function __construct(
        private readonly AuthService $auth,
        private readonly MfaService $mfa,
    ) {}

    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->auth->login(
            email: $request->string('email')->lower()->toString(),
            password: $request->string('password')->toString(),
            request: $request,
        );

        return response()->json([
            'token'        => $result['token'],
            'requires_mfa' => $result['requires_mfa'],
            'user'         => (new UserResource($result['user']))->toArray($request),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => (new UserResource($request->user()))->toArray($request),
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
            'user' => (new UserResource($user->fresh()))->toArray($request),
        ]);
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! \Illuminate\Support\Facades\Hash::check(
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

        return response()->json(['message' => 'Password updated.']);
    }

    // ---------------------------- MFA ----------------------------

    public function mfaEnroll(Request $request): JsonResponse
    {
        $user = $request->user();
        $payload = $this->mfa->beginEnrollment($user);

        return response()->json([
            'secret'         => $payload['secret'],
            'qr_url'         => $payload['qr_url'],
            'recovery_codes' => $payload['recovery_codes'],
            'message'        => 'Scan the QR code in your authenticator app, then verify.',
        ]);
    }

    public function mfaEnrollVerify(MfaEnrollVerifyRequest $request): JsonResponse
    {
        $this->mfa->confirmEnrollment(
            user: $request->user(),
            code: $request->string('code')->toString(),
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

    public function mfaDisable(Request $request): JsonResponse
    {
        $this->mfa->disable($request->user());

        return response()->json(['message' => 'MFA disabled.']);
    }
}