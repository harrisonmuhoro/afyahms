<?php

declare(strict_types=1);

namespace App\Modules\Auth\Controllers;

use App\Http\Controllers\Controller;
use App\Mail\PasswordResetLinkMail;
use App\Models\User;
use App\Models\VerificationToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class ForgotPasswordController extends Controller
{
    private const TOKEN_LIFETIME_MINUTES = 15;

    public function requestReset(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email:rfc,strict', 'max:254'],
        ]);

        $email = strtolower($validated['email']);
        $user = User::whereRaw('LOWER(email) = ?', [$email])->first();

        // Keep the response the same whether the address exists or not.
        if (! $user || ! $user->is_active || $user->deactivated_at !== null) {
            return $this->requestAccepted();
        }

        VerificationToken::query()
            ->where('user_id', $user->id)
            ->where('type', 'password_reset_token')
            ->whereNull('used_at')
            ->update(['used_at' => now()]);

        $plainToken = Str::random(64);
        $tokenRecord = VerificationToken::create([
            'user_id' => $user->id,
            'channel' => 'email',
            'token' => hash('sha256', $plainToken),
            'new_value' => $user->email,
            'type' => 'password_reset_token',
            'attempts' => 0,
            'sends' => 1,
            'expires_at' => now()->addMinutes(self::TOKEN_LIFETIME_MINUTES),
        ]);

        $frontendUrl = rtrim((string) config('app.frontend_url', 'http://localhost:5173'), '/');
        $resetUrl = $frontendUrl.'/forgot-password#email='.rawurlencode($user->email)
            .'&token='.rawurlencode($plainToken);

        try {
            Mail::to($user->email)->send(new PasswordResetLinkMail($resetUrl));
        } catch (\Throwable $exception) {
            $tokenRecord->delete();
            report($exception);

            return response()->json([
                'message' => 'We could not send the reset email right now. Please try again later.',
            ], 503);
        }

        return $this->requestAccepted();
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email:rfc,strict', 'max:254'],
            'reset_token' => ['required', 'string', 'min:40', 'max:100'],
            'password' => ['required', 'string', 'min:'.config('auth.password.min_length', 12), 'confirmed'],
        ]);

        DB::transaction(function () use ($validated): void {
            $user = User::whereRaw('LOWER(email) = ?', [strtolower($validated['email'])])->first();
            if (! $user) {
                throw ValidationException::withMessages([
                    'reset_token' => 'This reset link is invalid or has expired. Request a new link.',
                ]);
            }

            $tokenRecord = VerificationToken::query()
                ->where('user_id', $user->id)
                ->where('type', 'password_reset_token')
                ->whereNull('used_at')
                ->latest('id')
                ->lockForUpdate()
                ->first();

            if (! $tokenRecord
                || $tokenRecord->isExpired()
                || ! hash_equals($tokenRecord->token, hash('sha256', $validated['reset_token']))) {
                throw ValidationException::withMessages([
                    'reset_token' => 'This reset link is invalid or has expired. Request a new link.',
                ]);
            }

            $tokenRecord->update(['used_at' => now()]);
            $user->forceFill([
                'password' => $validated['password'],
                'password_changed_at' => now(),
                'failed_login_attempts' => 0,
                'locked_until' => null,
            ])->save();
            $user->tokens()->delete();
        });

        return response()->json([
            'message' => 'Password has been reset. You can now sign in.',
        ]);
    }

    private function requestAccepted(): JsonResponse
    {
        return response()->json([
            'message' => 'If an active account exists with this email, we have sent a password reset link. The link expires in 15 minutes.',
        ]);
    }
}
