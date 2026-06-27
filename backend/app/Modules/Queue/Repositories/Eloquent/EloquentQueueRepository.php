<?php

declare(strict_types=1);

namespace App\Modules\Queue\Repositories\Eloquent;

use App\Modules\Queue\Models\QueueEvent;
use App\Modules\Queue\Models\QueueStation;
use App\Modules\Queue\Models\QueueTicket;
use App\Modules\Queue\Models\Visit;
use App\Modules\Queue\Repositories\Contracts\QueueRepository;
use App\Support\Repositories\EloquentRepository;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

/**
 * @extends EloquentRepository<QueueTicket>
 */
final class EloquentQueueRepository extends EloquentRepository implements QueueRepository
{
    protected string $modelClass = QueueTicket::class;

    public function listActiveStations(int $branchId): Collection
    {
        return QueueStation::query()
            ->where('branch_id', $branchId)
            ->where('is_active', true)
            ->orderBy('pipeline_order')
            ->get();
    }

    public function findStation(int $stationId): ?Model
    {
        /** @var QueueStation|null */
        return QueueStation::query()->find($stationId);
    }

    public function findStationByCode(int $branchId, string $code): ?Model
    {
        /** @var QueueStation|null */
        return QueueStation::query()
            ->where('branch_id', $branchId)
            ->where('code', $code)
            ->first();
    }

    public function findTicket(int $ticketId): ?Model
    {
        /** @var QueueTicket|null */
        return QueueTicket::query()->find($ticketId);
    }

    public function findTicketForVisit(int $visitId, string $state): ?Model
    {
        /** @var QueueTicket|null */
        return QueueTicket::query()
            ->where('visit_id', $visitId)
            ->where('state', $state)
            ->orderByDesc('id')
            ->first();
    }

    public function ticketForUpdate(int $ticketId): ?Model
    {
        /** @var QueueTicket|null */
        return QueueTicket::query()->lockForUpdate()->find($ticketId);
    }

    public function waitingAtStation(int $stationId): Collection
    {
        // MTS weight order: red(0), orange(1), yellow(2), green(3), blue(4).
        // Within category, FIFO by sequence_value.
        return QueueTicket::query()
            ->with(['station', 'patient'])
            ->where('station_id', $stationId)
            ->whereIn('state', ['waiting', 'issued', 'called', 'in_service'])
            ->orderByRaw("FIELD(mts_category, 'red','orange','yellow','green','blue') ASC")
            ->orderBy('priority')
            ->orderBy('sequence_value')
            ->get();
    }

    public function createTicket(array $attributes): Model
    {
        /** @var QueueTicket */
        return $this->newQuery()->create($attributes);
    }

    public function updateTicket(Model $ticket, array $attributes): Model
    {
        $ticket->update($attributes);

        /** @var QueueTicket $ticket */
        return $ticket->refresh();
    }

    public function createEvent(array $attributes): Model
    {
        return QueueEvent::query()->create($attributes);
    }

    public function createVisit(array $attributes): Model
    {
        /** @var Visit */
        return Visit::query()->create($attributes);
    }

    public function updateVisit(Model $visit, array $attributes): Model
    {
        $visit->update($attributes);

        /** @var Visit $visit */
        return $visit->refresh();
    }

    public function findVisit(int $visitId): ?Model
    {
        /** @var Visit|null */
        return Visit::query()->find($visitId);
    }

    public function openVisitsForPatient(int $patientId): Collection
    {
        return Visit::query()
            ->where('patient_id', $patientId)
            ->whereIn('status', ['open', 'in_progress'])
            ->orderByDesc('visit_date')
            ->get();
    }
}
