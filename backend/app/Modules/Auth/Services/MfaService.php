<?php

declare(strict_types=1);

namespace App\Modules\Auth\Services;

use App\Exceptions\Domain\ForbiddenException;
use App\Models\User;
use App\Modules\Auth\Models\UserMfa;
use App\Services\OtpService;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

/**
 * TOTP MFA enrollment + verification using Google2FA.
 *
 * Foundation §11: TOTP MFA mandatory for hospital-admin, doctor, pharmacist.
 */
final class MfaService
{
    private Google2FA $google2fa;
    private OtpService $otpService;

    public function __construct(OtpService $otpService)
    {
        $this->google2fa = new Google2FA();
        $this->google2fa->setWindow((int) config('auth.mfa.window', 1));
        $this->otpService = $otpService;
    }

    /**
     * Begin MFA enrollment. Returns a fresh secret + QR code URL + recovery codes.
     * Enrollment is committed when the user verifies the first TOTP code.
     *
     * @return array{secret: string|null, qr_url: string|null, recovery_codes: array<int, string>}
     */
    public function beginEnrollment(User $user, string $type = 'totp'): array
    {
        if ($user->mfa_enabled && $user->activeMfa() !== null) {
            throw new ForbiddenException('MFA is already enabled for this account.');
        }

        $user->mfa()->whereNull('enabled_at')->delete();

        $recoveryCodes = $this->generateRecoveryCodes();

        if ($type === 'email') {
            $mfa = UserMfa::create([
                'user_id'        => $user->id,
                'type'           => 'email',
                'secret'         => null,
                'recovery_codes' => array_map(
                    fn (string $code) => HashRecoveryCode($code),
                    $recoveryCodes,
                ),
            ]);

            $this->otpService->send($user, $user->email, 'mfa_enrollment');

            return [
                'secret'         => null,
                'qr_url'         => null,
                'recovery_codes' => $recoveryCodes,
                'id'             => $mfa->id,
            ];
        }

        $secret = $this->google2fa->generateSecretKey(32);
        $issuer = (string) config('auth.mfa.issuer', 'AfyaHMS');
        $issuerSafe = str_replace(' ', '', $issuer);

        $otpauthUrl = $this->google2fa->getQRCodeUrl(
            company: $issuerSafe,
            holder: $user->email,
            secret: $secret,
        );

        $mfa = UserMfa::create([
            'user_id'        => $user->id,
            'type'           => 'totp',
            'secret'         => $secret,
            'recovery_codes' => array_map(
                fn (string $code) => HashRecoveryCode($code),
                $recoveryCodes,
            ),
        ]);

        return [
            'secret'         => $secret,
            'qr_url'         => $otpauthUrl,
            'recovery_codes' => $recoveryCodes,
            'id'             => $mfa->id,
        ];
    }

    /**
     * Confirm enrollment by verifying a TOTP code. Marks MFA as enabled.
     */
    public function confirmEnrollment(User $user, string $code): UserMfa
    {
        $mfa = $user->mfa()->whereNull('enabled_at')->latest()->first()
            ?? throw new ForbiddenException('No MFA setup in progress.');

        if ($mfa->type === 'email') {
            // This throws ValidationException if invalid
            $this->otpService->verify($user, 'mfa_enrollment', $code);
        } else {
            if (! $this->verifyTotp((string) $mfa->secret, $code)) {
                throw new ForbiddenException('Invalid TOTP code.');
            }
        }

        $mfa->update(['enabled_at' => now()]);
        $user->forceFill([
            'mfa_enabled'      => true,
            'mfa_confirmed_at' => now(),
        ])->save();

        return $mfa;
    }

    /**
     * Verify a TOTP code OR a recovery code for the given user.
     */
    public function verify(User $user, string $code, bool $isRecovery = false): bool
    {
        $mfa = $user->activeMfa();
        if ($mfa === null) {
            return false;
        }

        if ($isRecovery) {
            foreach ($mfa->recovery_codes ?? [] as $hashed) {
                if (password_verify($code, $hashed)) {
                    $remaining = array_values(array_filter(
                        $mfa->recovery_codes ?? [],
                        fn ($c) => $c !== $hashed,
                    ));
                    $mfa->update(['recovery_codes' => $remaining]);

                    return true;
                }
            }

            return false;
        }

        if ($mfa->type === 'email') {
            try {
                // For login verification
                $this->otpService->verify($user, 'mfa_login', $code);
                return true;
            } catch (\Illuminate\Validation\ValidationException $e) {
                return false;
            }
        }

        return $this->verifyTotp((string) $mfa->secret, $code);
    }

    /**
     * Mark MFA as "freshly confirmed" — used after a successful password login
     * or after an explicit confirm step.
     */
    public function markConfirmed(User $user): void
    {
        $user->forceFill(['mfa_confirmed_at' => now()])->save();
    }

    public function disable(User $user): void
    {
        $user->mfa()->delete();
        $user->forceFill([
            'mfa_enabled'      => false,
            'mfa_confirmed_at' => null,
        ])->save();
    }

    private function verifyTotp(string $secret, string $code): bool
    {
        $clean = preg_replace('/\s+/', '', $code) ?? '';

        return $this->google2fa->verifyKey($secret, $clean);
    }

    /**
     * @return array<int, string>
     */
    private function generateRecoveryCodes(): array
    {
        $count = (int) config('auth.mfa.recovery_codes_count', 10);
        $codes = [];
        for ($i = 0; $i < $count; $i++) {
            $codes[] = strtoupper(Str::random(4).'-'.Str::random(4).'-'.Str::random(4));
        }

        return $codes;
    }
}

if (! function_exists('HashRecoveryCode')) {
    function HashRecoveryCode(string $code): string
    {
        return password_hash($code, PASSWORD_BCRYPT);
    }
}
