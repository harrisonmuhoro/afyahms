<?php

declare(strict_types=1);

namespace App\Modules\Emr\Policies;

use App\Models\User;
use App\Modules\Emr\Models\EmarRecord;
use App\Modules\Queue\Models\Visit;
use App\Modules\Tenancy\Services\BranchContext;

class EmarRecordPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('emr.read');
    }

    public function view(User $user, EmarRecord $record): bool
    {
        return $user->can('emr.read') && $this->inActiveBranch($user, $record);
    }

    public function create(User $user): bool
    {
        return $user->can('emr.create');
    }

    public function update(User $user, EmarRecord $record): bool
    {
        return $user->can('emr.update') && $this->inActiveBranch($user, $record);
    }

    private function inActiveBranch(User $user, EmarRecord $record): bool
    {
        $branchId = app(BranchContext::class)->get() ?? $user->home_branch_id;
        $visitBranchId = Visit::withoutGlobalScopes()->whereKey($record->visit_id)->value('branch_id');

        return $visitBranchId !== null && (int) $visitBranchId === (int) $branchId;
    }
}
