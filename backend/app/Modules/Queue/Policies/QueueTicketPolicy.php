<?php

declare(strict_types=1);

namespace App\Modules\Queue\Policies;

use App\Models\User;
use App\Modules\Queue\Models\QueueTicket;
use Illuminate\Auth\Access\HandlesAuthorization;

class QueueTicketPolicy
{
    use HandlesAuthorization;

    /**
     * Determine if the user can manage this specific queue ticket.
     * Enforces the department-context rule (docs/28 §8.3).
     */
    public function manage(User $user, QueueTicket $ticket): bool
    {
        // Global HA bypass
        if ($user->hasRole('hospital-admin')) {
            return true;
        }

        // Supervisor bypass
        if ($user->can('queue.manage')) {
            return true;
        }

        // Must be actively assigned to the ticket's station
        return $user->current_station_id !== null && $user->current_station_id === $ticket->station_id;
    }
}
