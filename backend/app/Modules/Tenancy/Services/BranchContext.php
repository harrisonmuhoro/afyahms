<?php

declare(strict_types=1);

namespace App\Modules\Tenancy\Services;

/**
 * Request-scoped holder for the active branch.
 *
 * Resolved by SetActiveBranch middleware from the Sanctum token claim.
 * Read by BranchScope (the global Eloquent filter).
 */
final class BranchContext
{
    private ?int $activeBranchId = null;

    public function set(?int $branchId): void
    {
        $this->activeBranchId = $branchId;
        app()->instance('active_branch_id', $branchId);
    }

    public function get(): ?int
    {
        if ($this->activeBranchId !== null) {
            return $this->activeBranchId;
        }

        return app()->bound('active_branch_id') ? app('active_branch_id') : null;
    }

    public function has(): bool
    {
        return $this->get() !== null;
    }

    public function require(): int
    {
        $id = $this->get();
        if ($id === null) {
            throw new \App\Exceptions\Domain\ValidationFailedException(
                'No active branch resolved for this request.',
                ['hint' => 'Ensure SetActiveBranch middleware ran before this point.'],
            );
        }

        return $id;
    }
}