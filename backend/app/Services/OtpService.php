<?php

namespace App\Services;

use App\Mail\OtpMail;
use App\Models\User;
use App\Models\VerificationToken;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class OtpService
{
    private const OTP_EXPIRY_MINUTES = 10;
    private const MAX_SENDS_PER_HOUR  = 3;
    private const MAX_ATTEMPTS        = 5;
    private const RESEND_COOLDOWN_SEC = 60;

    /**
     * Generate and send an OTP to the user's email.
     * Invalidates any prior active token for the same type.
     */
    public function send(User $user, string $newValue, string $type): void
    {
        $this->enforceRateLimit($user);
        $this->enforceResendCooldown($user, $type);

        // Invalidate all previous unused tokens of same type
        VerificationToken::where('user_id', $user->id)
            ->where('type', $type)
            ->whereNull('used_at')
            ->delete();

        $otp = $this->generateOtp();

        VerificationToken::create([
            'user_id'    => $user->id,
            'channel'    => 'email',
            'token'      => hash('sha256', $otp),
            'new_value'  => $newValue,
            'type'       => $type,
            'attempts'   => 0,
            'sends'      => 1,
            'expires_at' => now()->addMinutes(self::OTP_EXPIRY_MINUTES),
        ]);

        Mail::to($user->email)->send(
            new OtpMail($otp, $this->purposeLabel($type))
        );

        // Increment rate limiter
        RateLimiter::hit($this->rateLimiterKey($user), 3600);
    }

    /**
     * Validate submitted OTP. Returns the token's new_value on success.
     */
    public function verify(User $user, string $type, string $submittedOtp): string
    {
        $token = VerificationToken::where('user_id', $user->id)
            ->where('type', $type)
            ->whereNull('used_at')
            ->latest()
            ->first();

        if (! $token) {
            throw ValidationException::withMessages([
                'otp' => 'No active verification request found. Request a new code.',
            ]);
        }

        if ($token->isExpired()) {
            throw ValidationException::withMessages([
                'otp' => 'Code has expired. Request a new one.',
            ]);
        }

        if ($token->isLocked()) {
            throw ValidationException::withMessages([
                'otp' => 'Too many failed attempts. Request a new code.',
            ]);
        }

        if (! hash_equals($token->token, hash('sha256', $submittedOtp))) {
            $token->increment('attempts');
            $remaining = self::MAX_ATTEMPTS - $token->fresh()->attempts;

            throw ValidationException::withMessages([
                'otp' => "Invalid code. {$remaining} attempt(s) remaining.",
            ]);
        }

        // Mark as used
        $token->update(['used_at' => now()]);

        return $token->new_value;
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private function generateOtp(): string
    {
        return str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }

    private function rateLimiterKey(User $user): string
    {
        return "otp_send:{$user->id}";
    }

    private function enforceRateLimit(User $user): void
    {
        if (RateLimiter::tooManyAttempts($this->rateLimiterKey($user), self::MAX_SENDS_PER_HOUR)) {
            $seconds = RateLimiter::availableIn($this->rateLimiterKey($user));
            throw ValidationException::withMessages([
                'otp' => "Too many verification requests. Try again in {$seconds} seconds.",
            ]);
        }
    }

    private function enforceResendCooldown(User $user, string $type): void
    {
        $latest = VerificationToken::where('user_id', $user->id)
            ->where('type', $type)
            ->whereNull('used_at')
            ->latest()
            ->first();

        if ($latest && $latest->created_at->diffInSeconds(now()) < self::RESEND_COOLDOWN_SEC) {
            $wait = self::RESEND_COOLDOWN_SEC - $latest->created_at->diffInSeconds(now());
            throw ValidationException::withMessages([
                'otp' => "Please wait {$wait} seconds before requesting another code.",
            ]);
        }
    }

    private function purposeLabel(string $type): string
    {
        return match($type) {
            'login_contact_change' => 'Login Contact Change',
            'password_reset'       => 'Password Reset',
            'password_reset_mfa'   => 'Password Reset (MFA)',
            'mfa_enrollment'       => 'MFA Enrollment',
            'mfa_login'            => 'Login Verification',
            default                => 'Verification',
        };
    }
}
