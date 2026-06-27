<?php

declare(strict_types=1);

namespace App\Modules\Documents\Policies;

use App\Models\User;
use App\Modules\Documents\Models\Document;

/**
 * Authorization for Document access. Sensitive clinical files require
 * an active branch scope + documents.read permission.
 */
final class DocumentPolicy
{
    public function view(User $user, Document $document): bool
    {
        return $user->can('documents.read')
            && $user->accessibleBranchIds() !== []
            && in_array($document->branch_id, $user->accessibleBranchIds(), true);
    }

    public function delete(User $user, Document $document): bool
    {
        return $user->can('documents.delete') && $this->view($user, $document);
    }
}