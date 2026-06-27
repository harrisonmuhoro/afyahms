<?php

declare(strict_types=1);

namespace App\Modules\Queue\Repositories\Contracts;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

interface QueueRepository
{
    /** @return Collection<int, \App\Modules\Queue\Models\QueueStation> */
    public function listActiveStations(int $branchId): Collection;

    public function findStation(int $stationId): ?Model;

    public function findStationByCode(int $branchId, string $code): ?Model;

    public function findTicket(int $ticketId): ?Model;

    public function findTicketForVisit(int $visitId, string $state): ?Model;

    public function ticketForUpdate(int $ticketId): ?Model;

    /**
     * @return Collection<int, \App\Modules\Queue\Models\QueueTicket>
     */
    public function waitingAtStation(int $stationId): Collection;

    public function createTicket(array $attributes): Model;

    public function updateTicket(Model $ticket, array $attributes): Model;

    public function createEvent(array $attributes): Model;

    public function createVisit(array $attributes): Model;

    public function updateVisit(Model $visit, array $attributes): Model;

    public function findVisit(int $visitId): ?Model;

    /**
     * @return Collection<int, \App\Modules\Queue\Models\Visit>
     */
    public function openVisitsForPatient(int $patientId): Collection;
}
