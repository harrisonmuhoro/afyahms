<?php

declare(strict_types=1);

namespace App\Modules\Auth\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\CompleteProfileRequest;
use App\Models\User;
use App\Services\Auth\PatientRegistrationService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;

final class GoogleAuthController extends Controller
{
    public function __construct(
        private readonly PatientRegistrationService $registrationService
    ) {}

    public function redirect(): JsonResponse
    {
        return response()->json([
            'url' => Socialite::driver('google')->stateless()->redirect()->getTargetUrl(),
        ]);
    }

    public function callback(Request $request): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        try {
            /** @var \Laravel\Socialite\Two\AbstractProvider $provider */
            $provider = Socialite::driver('google')->stateless();
            if (app()->environment('local')) {
                $provider->setHttpClient(new \GuzzleHttp\Client(['verify' => false]));
            }
            $googleUser = $provider->user();
        } catch (Exception $e) {
            return response()->json(['message' => 'Failed to authenticate with Google.', 'error' => $e->getMessage()], 401);
        }

        $user = User::where('google_id', $googleUser->getId())->first();

        if (! $user) {
            $user = User::where('email', $googleUser->getEmail())->first();

            if ($user) {
                $user->update(['google_id' => $googleUser->getId()]);
            } else {
                $user = $this->registrationService->registerFromGoogle($googleUser);
            }
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        // Redirect to the frontend callback page with the token
        $frontendUrl = config('app.frontend_url', 'http://localhost:5173');

        return redirect()->to($frontendUrl.'/auth/callback?token='.urlencode($token));
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
