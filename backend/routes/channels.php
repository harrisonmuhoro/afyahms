<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
| Foundation §8 — channel authorizations for queue boards, alerts, portal.
*/

Broadcast::channel('branch.{branchId}.queue', function ($user, int $branchId) {
    if (! $user->can('queue.read')) {
        return false;
    }

    if ($user->can('branch.view-all')) {
        return true;
    }

    return in_array($branchId, $user->accessibleBranchIds(), true);
});

Broadcast::channel('user.{userId}', function ($user, int $userId) {
    return (int) $user->id === $userId;
});

Broadcast::channel('patient.{patientId}.portal', function ($user, int $patientId) {
    // Patient portal: the patient themselves + authorised clinical users.
    if ($user->hasRole('patient')) {
        return (int) $user->patient_id === $patientId;
    }

    return $user->can('patients.read');
});