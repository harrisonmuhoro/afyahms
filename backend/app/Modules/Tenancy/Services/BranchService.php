<?php

declare(strict_types=1);

namespace App\Modules\Tenancy\Services;

use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Models\UserBranchAccess;
use App\Modules\Tenancy\Repositories\Contracts\BranchRepository;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * High-level branch operations. Reached only by the Tenancy module's
 * controllers and admin console. Other modules read branches but never
 * mutate them.
 */
final class BranchService
{
    public function __construct(private readonly BranchRepository $branches) {}

    public function list(): Collection
    {
        return $this->branches->listActive();
    }

    public function create(array $attributes): Branch
    {
        return $this->branches->create($attributes);
    }

    public function update(Branch $branch, array $attributes): Branch
    {
        return $this->branches->update($branch, $attributes);
    }

    public function findAccessibleForUser(User $user, string|int $id): ?Branch
    {
        if (! is_string($id) || ctype_digit($id)) {
            $branch = $this->branches->find((int) $id);
        } else {
            $branch = $this->branches->findByPublicId($id);
        }

        if ($branch === null) {
            return null;
        }

        if ($user->can('branch.view-all')) {
            return $branch;
        }

        if (! $branch->is_active) {
            return null;
        }


        return in_array($branch->id, $user->accessibleBranchIds(), true) ? $branch : null;
    }

    public function listForUser(User $user): Collection
    {
        if ($user->can('branch.view-all')) {
            return $this->branches->listAll();
        }

        return $user->branches()
            ->where('is_active', true)
            ->orderBy('name')
            ->get();
    }

    /**
     * Grant a user access to a branch. Idempotent.
     */
    public function grantAccess(User $user, Branch $branch, bool $isHome = false, ?User $by = null): UserBranchAccess
    {
        return UserBranchAccess::query()->updateOrCreate(
            ['user_id' => $user->id, 'branch_id' => $branch->id],
            [
                'is_home'    => $isHome,
                'granted_at' => now(),
                'granted_by' => $by?->id,
            ],
        );
    }

    public function revokeAccess(User $user, Branch $branch): void
    {
        UserBranchAccess::query()
            ->where('user_id', $user->id)
            ->where('branch_id', $branch->id)
            ->delete();
    }
}
