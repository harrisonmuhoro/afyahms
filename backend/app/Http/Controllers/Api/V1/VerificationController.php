<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class VerificationController extends Controller
{
    public function __construct(private readonly OtpService $otpService) {}

    /**
     * POST /api/v1/account/send-otp
     */
    public function send(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type'             => ['required', 'in:login_contact_change,password_reset'],
            'new_value'        => ['required', 'email', 'max:255'],
            'current_password' => ['required', 'string'],
        ]);

        // Re-authenticate before sending OTP
        if (! Hash::check($validated['current_password'], $request->user()->password)) {
            return response()->json([
                'message' => 'Current password is incorrect.',
            ], 422);
        }

        $this->otpService->send(
            $request->user(),
            $validated['new_value'],
            $validated['type'],
        );

        return response()->json([
            'message' => 'Verification code sent to your email.',
        ]);
    }

    /**
     * POST /api/v1/account/verify-otp
     */
    public function verify(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'in:login_contact_change,password_reset'],
            'otp'  => ['required', 'digits:6'],
        ]);

        $newValue = $this->otpService->verify(
            $request->user(),
            $validated['type'],
            $validated['otp'],
        );

        // Apply the verified change
        if ($validated['type'] === 'login_contact_change') {
            $request->user()->update(['email' => $newValue]);
        }

        return response()->json([
            'message' => 'Verification successful. Contact updated.',
        ]);
    }
}
