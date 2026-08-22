<?php

declare(strict_types=1);

namespace App\Modules\Auth\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\VerificationToken;
use App\Services\OtpService;
use App\Modules\Auth\Services\MfaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class ForgotPasswordController extends Controller
{
    public function __construct(
        private readonly OtpService $otpService,
        private readonly MfaService $mfaService
    ) {}

    public function requestReset(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        // Prevent email enumeration: return same generic response even if user not found
        // or just let it fail if internal. Given it's a staff portal, we can be a bit more open or strict.
        if (! $user || ! $user->is_active) {
            return response()->json([
                'message' => 'If an active account exists with this email, we have sent instructions.',
            ]);
        }

        // Check if MFA is enabled
        if (! $user->mfa_enabled) {
            // Standard reset flow: send OTP to email
            $this->otpService->send($user, $user->email, 'password_reset');
            return response()->json([
                'message' => 'An OTP has been sent to your email.',
                'mfa_required' => false,
            ]);
        }

        $mfa = $user->activeMfa();
        
        if ($mfa->type === 'email') {
            $this->otpService->send($user, $user->email, 'password_reset_mfa');
            return response()->json([
                'message' => 'An OTP has been sent to your MFA email.',
                'mfa_required' => true,
                'mfa_type' => 'email',
            ]);
        }

        // TOTP
        return response()->json([
            'message' => 'Please provide your Authenticator App code.',
            'mfa_required' => true,
            'mfa_type' => 'totp',
        ]);
    }

    public function verifyCode(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email:rfc,strict',
            'code' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->firstOrFail();

        if (! $user->mfa_enabled) {
            $this->otpService->verify($user, 'password_reset', $request->code);
        } else {
            $mfa = $user->activeMfa();
            if ($mfa->type === 'email') {
                $this->otpService->verify($user, 'password_reset_mfa', $request->code);
            } else {
                if (! $this->mfaService->verify($user, $request->code)) {
                    throw ValidationException::withMessages(['code' => 'Invalid Authenticator code.']);
                }
            }
        }

        // Generate a short-lived reset token (valid for 15 mins)
        $token = Str::random(60);
        
        VerificationToken::create([
            'user_id'    => $user->id,
            'channel'    => 'reset',
            'token'      => hash('sha256', $token),
            'new_value'  => $user->email,
            'type'       => 'password_reset_token',
            'attempts'   => 0,
            'sends'      => 1,
            'expires_at' => now()->addMinutes(15),
        ]);

        return response()->json([
            'message' => 'Code verified.',
            'reset_token' => $token,
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email:rfc,strict',
            'reset_token' => 'required|string',
            'password' => 'required|string|min:5|confirmed',
        ]);

        $user = User::where('email', $request->email)->firstOrFail();

        $tokenRecord = VerificationToken::where('user_id', $user->id)
            ->where('type', 'password_reset_token')
            ->whereNull('used_at')
            ->latest()
            ->first();

        if (! $tokenRecord || $tokenRecord->isExpired() || ! hash_equals($tokenRecord->token, hash('sha256', $request->reset_token))) {
            throw ValidationException::withMessages(['reset_token' => 'Invalid or expired reset token. Please restart the process.']);
        }

        $tokenRecord->update(['used_at' => now()]);

        $user->forceFill([
            'password' => $request->password,
            'password_changed_at' => now(),
        ])->save();

        // Invalidate all active sessions
        $user->tokens()->delete();

        return response()->json([
            'message' => 'Password has been successfully reset. You can now log in.',
        ]);
    }
}
