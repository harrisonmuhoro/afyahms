<?php

declare(strict_types=1);

namespace App\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property-read User $resource
 */
final class UserResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $user = $this->resource;

        return [
            'id'                  => $user->public_id,
            'name'                => $user->name,
            'email'               => $user->email,
            'phone'               => $user->phone,
            'locale'              => $user->locale,
            'theme'               => $user->theme,
            'is_active'           => ! $user->isDeactivated(),
            'deactivated_at'      => $user->deactivated_at?->toIso8601String(),
            'deactivated_reason'  => $user->deactivated_reason,
            'deactivated_by'      => $user->deactivated_by,
            'home_branch_id'      => $user->home_branch_id,
            'current_branch_id'   => $user->current_branch_id,
            'mfa_enabled'         => (bool) $user->mfa_enabled,
            'password_expired'    => method_exists($user, 'passwordExpired') ? $user->passwordExpired() : false,
            'roles'               => $user->getRoleNames(),
            'permissions'         => $user->getAllPermissions()->pluck('name'),
            'branches'            => $user->relationLoaded('branches') ? $user->branches->map(fn ($b) => [
                'id'   => $b->public_id,
                'code' => $b->code,
                'name' => $b->name,
            ]) : null,
            'created_at'          => $user->created_at?->toIso8601String(),
        ];
    }
}
