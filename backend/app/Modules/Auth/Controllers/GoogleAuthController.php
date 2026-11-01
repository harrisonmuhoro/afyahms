<?php

declare(strict_types=1);

namespace App\Modules\Auth\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\CompleteProfileRequest;
use App\Models\User;
use App\Services\Auth\PatientRegistrationService;
use App\Modules\Admin\Rbac;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

final class GoogleAuthController extends Controller
{
    public function __construct(
        private readonly PatientRegistrationService $registrationService
    ) {}

    public function redirect(): JsonResponse
    {
        $state = Str::random(64);
        Cache::put($this->stateKey($state), true, now()->addMinutes(5));

        return response()->json([
            'url' => Socialite::driver('google')->stateless()->with(['state' => $state])->redirect()->getTargetUrl(),
        ]);
    }

    public function callback(Request $request): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        $state = (string) $request->query('state', '');
        if ($state === '' || Cache::pull($this->stateKey($state)) !== true) {
            return response()->json(['message' => 'Google sign-in could not be verified. Please try again.'], 401);
        }

        try {
            /** @var \Laravel\Socialite\Two\AbstractProvider $provider */
            $provider = Socialite::driver('google')->stateless();
            if (app()->environment('local')) {
                $provider->setHttpClient(new \GuzzleHttp\Client(['verify' => false]));
            }
            $googleUser = $provider->user();
        } catch (Exception $e) {
            report($e);
            return response()->json(['message' => 'Failed to authenticate with Google. Please try again.'], 401);
        }

        if (filter_var($googleUser->getRaw()['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN) !== true) {
            return response()->json(['message' => 'Google must verify your email address before sign-in.'], 403);
        }

        $user = User::where('google_id', $googleUser->getId())->first();

        if (! $user) {
            $user = User::where('email', strtolower((string) $googleUser->getEmail()))->first();

            if ($user) {
                $user->update(['google_id' => $googleUser->getId()]);
            } else {
                $user = $this->registrationService->registerFromGoogle($googleUser);
            }
        }

        if (! $user->is_active || $user->deactivated_at !== null || $user->isLocked()) {
            return response()->json(['message' => 'This account is unavailable. Contact your administrator.'], 403);
        }

        if ($user->hasAnyRole(Rbac::MFA_REQUIRED) || $user->mfa_enabled) {
            return response()->json(['message' => 'Staff accounts must sign in with their password and complete MFA.'], 403);
        }

        $token = $user->createToken('google-spa')->plainTextToken;
        $exchangeCode = Str::random(64);
        Cache::put($this->exchangeKey($exchangeCode), $token, now()->addSeconds(60));

        $frontendUrl = config('app.frontend_url', 'http://localhost:5173');

        return redirect()->to($frontendUrl.'/auth/callback#code='.urlencode($exchangeCode));
    }

    public function exchange(Request $request): JsonResponse
    {
        $validated = $request->validate(['code' => ['required', 'string', 'min:40', 'max:100']]);
        $token = Cache::pull($this->exchangeKey($validated['code']));
        if (! is_string($token) || $token === '') {
            return response()->json(['message' => 'Google sign-in code is invalid or expired.'], 401);
        }

        return response()->json(['token' => $token]);
    }

    private function stateKey(string $state): string
    {
        return 'auth.google.state:'.hash('sha256', $state);
    }

    private function exchangeKey(string $code): string
    {
        return 'auth.google.exchange:'.hash('sha256', $code);
    }

    public function completeProfile(CompleteProfileRequest $request): JsonResponse
    {
        $user = $request->user();

        if ($user->profile_complete) {
            return response()->json(['message' => 'Profile already complete.'], 400);
        }

        $patient = $user->patient;

        if (! $patient) {
            return response()->json(['message' => 'Patient record not found.'], 404);
        }

        $user->update([
            'phone' => $request->phone,
            'address' => $request->address,
            'next_of_kin_name' => $request->next_of_kin_name,
            'next_of_kin_phone' => $request->next_of_kin_phone,
            'home_branch_id' => $request->home_branch_id,
            'profile_complete' => true,
        ]);

        $patient->update([
            'branch_id' => $request->home_branch_id,
            'first_name' => $request->first_name,
            'middle_name' => $request->middle_name,
            'last_name' => $request->last_name,
            'gender' => $request->gender,
            'date_of_birth' => $request->date_of_birth,
            'county' => $request->county,
            'sub_county' => $request->sub_county,
            'national_id' => $request->national_id,
            'guardian_name' => $request->guardian_name,
            'guardian_national_id' => $request->guardian_national_id,
            'guardian_relationship' => $request->guardian_relationship,
        ]);

        return response()->json([
            'message' => 'Profile completed successfully.',
            'profile_complete' => true,
        ]);
    }
}
