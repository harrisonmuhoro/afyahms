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

        return [
            'id'              => $user->id,
            'name'            => $user->name,
            'email'           => $user->email,
            'phone'           => $user->phone,
            'mfa_enabled'     => (bool) $user->mfa_enabled,
            'home_branch'     => $user->homeBranch ? [
                'id'   => $user->homeBranch->id,
                'code' => $user->homeBranch->code,
                'name' => $user->homeBranch->name,
            ] : null,
            'current_branch'  => $user->currentBranch ? [
                'id'   => $user->currentBranch->id,
                'code' => $user->currentBranch->code,
                'name' => $user->currentBranch->name,
            ] : null,
            'branches'        => $user->branches->map(fn ($b) => [
                'id'   => $b->id,
                'code' => $b->code,
                'name' => $b->name,
            ])->all(),
            // Users hold each role under both the `web` and `sanctum` guards (the
            // permissions:mirror-to-sanctum command assigns a sanctum copy so Spatie
            // resolves permissions on token requests). Both copies share a name, so
            // dedupe to avoid `["receptionist","receptionist"]` in the API surface.
            'roles'           => $user->roles->pluck('name')->unique()->values()->all(),
            'permissions'     => $user->getAllPermissions()->pluck('name')->unique()->values()->all(),
            'created_at'      => $user->created_at?->toIso8601String(),
            'last_seen_at'    => $user->last_seen_at?->toIso8601String(),
        ];
    }
}