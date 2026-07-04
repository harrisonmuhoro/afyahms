<?php

declare(strict_types=1);

namespace App\Modules\Staff\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Audit\Services\AuditLogService;
use App\Modules\Auth\Resources\UserResource;
use App\Modules\Staff\Models\PendingContactChange;
use App\Modules\Staff\Requests\UpdateStaffBasicProfileRequest;
use App\Modules\Staff\Requests\UpdateStaffContactRequest;
use App\Modules\Staff\Requests\UpdateStaffPasswordRequest;
use App\Modules\Staff\Requests\UploadStaffPhotoRequest;
use App\Modules\Staff\Requests\VerifyStaffContactRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

final class StaffProfileController extends Controller
{
    public function __construct(private readonly AuditLogService $audit) {}

    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->assertStaffUser($user);

        return response()->json([
            'user' => (new UserResource($user))->toArray($request),
            'employment' => [
                'roles' => $user->roles->pluck('name')->unique()->values()->all(),
                'department' => $user->department,
                'employee_number' => $user->staff_id,
                'branch' => $user->currentBranch ? [
                    'id' => $user->currentBranch->id,
                    'code' => $user->currentBranch->code,
                    'name' => $user->currentBranch->name,
                ] : null,
                'account_status' => $user->isDeactivated() ? 'inactive' : 'active',
            ],
            'pending_contact_changes' => PendingContactChange::query()
                ->where('user_id', $user->id)
                ->whereNull('verified_at')
                ->where('expires_at', '>', now())
                ->get(['field', 'new_value', 'expires_at'])
                ->map(fn (PendingContactChange $change) => [
                    'field' => $change->field,
                    'new_value' => $this->maskContact($change->field, $change->new_value),
                    'expires_at' => $change->expires_at?->toIso8601String(),
                ])
                ->all(),
        ]);
    }

    public function updateBasic(UpdateStaffBasicProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $this->assertStaffUser($user);
        $this->confirmPassword($request, $user->password);

        $payload = $request->safe()->except(['current_password']);
        $before = $user->only(array_keys($payload));
        $user->forceFill($payload)->save();

        $this->audit->recordFieldChanges(
            event: 'user.profile.self_updated',
            actor: $user,
            request: $request,
            subject: $user,
            before: $before,
            after: $payload,
            context: ['action' => 'self_updated'],
        );

        return response()->json([
            'user' => (new UserResource($user->fresh()))->toArray($request),
            'updated_at' => now()->toIso8601String(),
        ]);
    }

    public function updateContact(UpdateStaffContactRequest $request): JsonResponse
    {
        $user = $request->user();
        $this->assertStaffUser($user);
        $this->confirmPassword($request, $user->password);

        $field = $request->string('field')->toString();
        $plainToken = (string) random_int(100000, 999999);

        $change = PendingContactChange::query()->updateOrCreate(
            ['user_id' => $user->id, 'field' => $field],
            [
                'new_value' => $request->string('new_value')->toString(),
                'verification_token' => hash('sha256', $plainToken),
                'expires_at' => now()->addDay(),
                'verified_at' => null,
            ],
        );

        $this->audit->record(
            event: 'user.contact_change_requested',
            actor: $user,
            request: $request,
            subject: $user,
            context: [
                'action' => 'contact_change_requested',
                'field_name' => $field,
                'old_value' => $this->maskContact($field, (string) $user->{$field}),
                'new_value' => $this->maskContact($field, $change->new_value),
            ],
        );

        if ($field === 'email') {
            \Illuminate\Support\Facades\Mail::to($change->new_value)
                ->send(new \App\Mail\OtpMail($plainToken, 'Verification for new contact email'));
        }

        return response()->json(array_filter([
            'message' => 'Verification has been sent to the new contact value.',
            'field' => $field,
            'expires_at' => $change->expires_at?->toIso8601String(),
            'debug_verification_token' => config('app.debug') ? $plainToken : null,
        ]), 202);
    }

    public function verifyContact(VerifyStaffContactRequest $request): JsonResponse
    {
        $user = $request->user();
        $this->assertStaffUser($user);
        $field = $request->string('field')->toString();
        $tokenHash = hash('sha256', $request->string('token')->toString());

        $change = PendingContactChange::query()
            ->where('user_id', $user->id)
            ->where('field', $field)
            ->where('verification_token', $tokenHash)
            ->whereNull('verified_at')
            ->where('expires_at', '>', now())
            ->first();

        if ($change === null) {
            abort(422, 'Verification token is invalid or expired.');
        }

        $oldValue = (string) $user->{$field};
        DB::transaction(function () use ($user, $field, $change): void {
            $user->forceFill([$field => $change->new_value])->save();
            $change->forceFill(['verified_at' => now()])->save();
        });

        $this->audit->record(
            event: "user.contact_{$field}_changed",
            actor: $user,
            request: $request,
            subject: $user,
            context: [
                'action' => "contact_{$field}_changed",
                'field_name' => $field,
                'old_value' => $this->maskContact($field, $oldValue),
                'new_value' => $this->maskContact($field, $change->new_value),
            ],
        );

        return response()->json([
            'message' => ucfirst($field).' updated.',
            'user' => (new UserResource($user->fresh()))->toArray($request),
        ]);
    }

    public function updatePassword(UpdateStaffPasswordRequest $request): JsonResponse
    {
        $user = $request->user();
        $this->assertStaffUser($user);
        $this->confirmPassword($request, $user->password);

        $user->forceFill([
            'password' => $request->string('password')->toString(),
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

        return response()->json(['message' => 'Password updated. Other active sessions were invalidated.']);
    }

    public function uploadPhoto(UploadStaffPhotoRequest $request): JsonResponse
    {
        $user = $request->user();
        $this->assertStaffUser($user);
        $file = $request->file('file');
        $oldPath = $user->profile_photo_path;
        $path = $file->store("profile-photos/{$user->id}", 'local');

        if ($oldPath !== null && $oldPath !== $path) {
            Storage::disk('local')->delete($oldPath);
        }

        $user->forceFill(['profile_photo_path' => $path])->save();

        $this->audit->record(
            event: 'user.photo_updated',
            actor: $user,
            request: $request,
            subject: $user,
            context: [
                'action' => 'photo_updated',
                'field_name' => 'profile_photo_path',
                'old_value' => $oldPath,
                'new_value' => $path,
            ],
        );

        return response()->json([
            'message' => 'Profile photo updated.',
            'user' => (new UserResource($user->fresh()))->toArray($request),
        ]);
    }

    private function confirmPassword(Request $request, string $passwordHash): void
    {
        if (! Hash::check($request->string('current_password')->toString(), $passwordHash)) {
            abort(422, 'Current password is incorrect.');
        }
    }

    private function assertStaffUser(mixed $user): void
    {
        if ($user?->hasRole('patient')) {
            abort(403, 'Patient accounts must use the patient portal profile path.');
        }
    }

    private function maskContact(string $field, ?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($field === 'email') {
            [$name, $domain] = array_pad(explode('@', $value, 2), 2, '');

            return substr($name, 0, 2).str_repeat('*', max(strlen($name) - 2, 2)).'@'.$domain;
        }

        return str_repeat('*', max(strlen($value) - 4, 0)).substr($value, -4);
    }
}
