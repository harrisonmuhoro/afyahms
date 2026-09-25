<?php

declare(strict_types=1);

namespace App\Modules\Auth\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property-read \App\Models\User $resource
 */
final class UserResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $user = $this->resource;
        $canViewSensitiveStaffData = $request->user()?->can('staff.update') ?? false;

        return [
            'id'              => $user->id,
            'name'            => $user->name,
            'email'           => $user->email,
            'phone'           => $user->phone,
            'address'         => $user->address,
            'next_of_kin_name' => $user->next_of_kin_name,
            'next_of_kin_phone' => $user->next_of_kin_phone,
            'profile_photo_path' => $user->profile_photo_path ? asset('storage/' . $user->profile_photo_path) : null,
            'national_id'      => $canViewSensitiveStaffData ? $user->national_id : null,
            'date_of_birth'    => $canViewSensitiveStaffData ? $user->date_of_birth?->toDateString() : null,
            'staff_id'         => $user->staff_id,
            'department'       => $user->department,
            'specialization'   => $user->specialization,
            'license_number'   => $canViewSensitiveStaffData ? $user->license_number : null,
            'employment_type'  => $user->employment_type,
            'employment_start_date' => $user->employment_start_date?->toDateString(),
            'locale'          => $user->locale ?? config('hospital.locale', 'en'),
            'theme'           => $user->theme ?? 'system',
            'is_active'       => ! $user->isDeactivated(),
            'deactivated_at'  => $user->deactivated_at?->toIso8601String(),
            'deactivated_reason' => $user->deactivated_reason,
            'mfa_enabled'     => (bool) $user->mfa_enabled,
            'home_branch'     => $user->relationLoaded('homeBranch') && $user->homeBranch ? [
                'id'   => $user->homeBranch->id,
                'code' => $user->homeBranch->code,
                'name' => $user->homeBranch->name,
            ] : null,
            'home_branch_id'  => $user->home_branch_id,
            'current_branch'  => $user->relationLoaded('currentBranch') && $user->currentBranch ? [
                'id'   => $user->currentBranch->id,
                'code' => $user->currentBranch->code,
                'name' => $user->currentBranch->name,
            ] : null,
            'current_station' => $user->relationLoaded('currentStation') && $user->currentStation ? [
                'id'   => $user->currentStation->id,
                'code' => $user->currentStation->code,
                'name' => $user->currentStation->name,
            ] : null,
            'branches'        => $user->relationLoaded('branches') ? $user->branches->map(fn ($b) => [
                'id'   => $b->id,
                'code' => $b->code,
                'name' => $b->name,
            ])->all() : [],
            // Users hold each role under both the `web` and `sanctum` guards (the
            // permissions:mirror-to-sanctum command assigns a sanctum copy so Spatie
            // resolves permissions on token requests). Both copies share a name, so
            // dedupe to avoid `["receptionist","receptionist"]` in the API surface.
            'roles'           => $user->relationLoaded('roles') ? $user->roles->pluck('name')->unique()->values()->all() : [],
            'permissions'     => ($user->relationLoaded('permissions') && $user->relationLoaded('roles')) ? $user->getAllPermissions()->pluck('name')->unique()->values()->all() : [],
            'created_at'      => $user->created_at?->toIso8601String(),
            'last_seen_at'    => $user->last_seen_at?->toIso8601String(),
        ];
    }
}
