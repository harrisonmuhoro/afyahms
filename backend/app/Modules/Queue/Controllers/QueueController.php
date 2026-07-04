<?php

declare(strict_types=1);

namespace App\Modules\Queue\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Queue\Models\QueueStation;
use App\Modules\Queue\Models\QueueTicket;
use App\Modules\Queue\Models\Visit;
use App\Modules\Queue\Requests\OpenVisitRequest;
use App\Modules\Queue\Requests\QueueActionRequest;
use App\Modules\Queue\Resources\QueueStationResource;
use App\Modules\Queue\Resources\QueueTicketResource;
use App\Modules\Queue\Resources\VisitResource;
use App\Modules\Queue\Services\QueueService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class QueueController extends Controller
{
    public function __construct(private readonly QueueService $service) {}

    /** GET /api/v1/queue/stations — list active stations in active branch. */
    public function stations(Request $request): JsonResource
    {
        $branchId = $this->resolveBranchId($request);
        $stations = $this->service->listActiveStationsInternal($branchId);

        return QueueStationResource::collection($stations);
    }

    /**
     * GET /api/v1/queue/boards/{code}
     * Returns { station, waiting, in_service } — no PHI.
     */
    public function board(Request $request, string $code): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $station = QueueStation::query()
            ->where('branch_id', $branchId)
            ->where('code', $code)
            ->firstOrFail();

        $snapshot = $this->service->boardSnapshot($station);

        return response()->json([
            'data' => [
                'station'    => (new QueueStationResource($station))->resolve($request),
                'waiting'    => QueueTicketResource::collection($snapshot['waiting'])->resolve($request),
                'in_service' => $snapshot['in_service']
                    ? (new QueueTicketResource($snapshot['in_service']))->resolve($request)
                    : null,
            ],
            'meta' => [
                'as_of' => now()->toIso8601String(),
            ],
        ]);
    }

    /**
     * GET /api/v1/queue/boards/{code}/public — ticket numbers only, no PHI.
     * Used for waiting-room displays.
     */
    public function publicBoard(Request $request, string $code): JsonResponse
    {
        $branchId = $this->resolveBranchId($request);
        $station = QueueStation::query()
            ->where('branch_id', $branchId)
            ->where('code', $code)
            ->firstOrFail();

        $snapshot = $this->service->boardSnapshot($station);

        return response()->json([
            'data' => [
                'station'     => $station->only(['code', 'name']),
                'now_serving' => $snapshot['in_service']?->ticket_number,
                'waiting'     => $snapshot['waiting']
                    ->map(fn (QueueTicket $t) => [
                        'ticket_number' => $t->ticket_number,
                        'mts_category'  => $t->mts_category,
                    ])
                    ->values()
                    ->all(),
            ],
            'meta' => [
                'as_of' => now()->toIso8601String(),
            ],
        ]);
    }

    /** POST /api/v1/visits — open a visit + issue REC ticket. */
    public function openVisit(OpenVisitRequest $request): JsonResponse
    {
        $visit = $this->service->openVisit($request->validated(), $request->user());

        return (new VisitResource($visit->load('tickets')))
            ->response()
            ->setStatusCode(201);
    }

    /** GET /api/v1/visits/{id} */
    public function showVisit(Request $request, int $id): JsonResource
    {
        $visit = Visit::query()->findOrFail($id);

        return new VisitResource($visit->load('tickets'));
    }

    /** POST /api/v1/queue/stations/{id}/call-next */
    public function callNext(Request $request, int $stationId): JsonResource
    {
        $station = QueueStation::query()->findOrFail($stationId);
        $ticket = $this->service->callNext($station, $request->user());

        return new QueueTicketResource($ticket);
    }

    /** POST /api/v1/queue/tickets/{id}/start */
    public function startServing(Request $request, int $ticketId): JsonResource
    {
        $ticket = QueueTicket::query()->findOrFail($ticketId);
        $this->authorize('manage', $ticket);
        $ticket = $this->service->startServing($ticket, $request->user());

        return new QueueTicketResource($ticket);
    }

    /** POST /api/v1/queue/tickets/{id}/complete */
    public function complete(QueueActionRequest $request, int $ticketId): JsonResource
    {
        $ticket = QueueTicket::query()->findOrFail($ticketId);
        $this->authorize('manage', $ticket);
        $nextStation = $request->input('next_station');
        $ticket = $this->service->complete($ticket, $request->user(), $nextStation);

        return new QueueTicketResource($ticket);
    }

    /** POST /api/v1/queue/tickets/{id}/hold */
    public function hold(QueueActionRequest $request, int $ticketId): JsonResource
    {
        $ticket = QueueTicket::query()->findOrFail($ticketId);
        $this->authorize('manage', $ticket);
        $ticket = $this->service->hold($ticket, $request->user(), $request->input('reason'));

        return new QueueTicketResource($ticket);
    }

    /** POST /api/v1/queue/tickets/{id}/resume */
    public function resume(Request $request, int $ticketId): JsonResource
    {
        $ticket = QueueTicket::query()->findOrFail($ticketId);
        $this->authorize('manage', $ticket);
        $ticket = $this->service->resume($ticket, $request->user());

        return new QueueTicketResource($ticket);
    }

    /** POST /api/v1/queue/tickets/{id}/no-show */
    public function noShow(QueueActionRequest $request, int $ticketId): JsonResource
    {
        $ticket = QueueTicket::query()->findOrFail($ticketId);
        $this->authorize('manage', $ticket);
        $ticket = $this->service->markNoShow($ticket, $request->user(), $request->input('reason'));

        return new QueueTicketResource($ticket);
    }

    /** POST /api/v1/queue/tickets/{id}/emergency-bypass */
    public function emergencyBypass(QueueActionRequest $request, int $ticketId): JsonResource
    {
        $ticket = QueueTicket::query()->findOrFail($ticketId);
        $ticket = $this->service->emergencyBypass($ticket, $request->user(), $request->input('reason'));

        return new QueueTicketResource($ticket);
    }

    /** POST /api/v1/queue/tickets/{id}/mts — update MTS category. */
    public function updateMts(QueueActionRequest $request, int $ticketId): JsonResource
    {
        $ticket = QueueTicket::query()->findOrFail($ticketId);
        $category = (string) $request->input('mts_category');
        $ticket = $this->service->updateMtsCategory($ticket, $category, $request->user(), $request->input('reason'));

        return new QueueTicketResource($ticket);
    }

    private function resolveBranchId(Request $request): int
    {
        $active = app(\App\Modules\Tenancy\Services\BranchContext::class)->get();
        if ($active !== null) {
            return $active;
        }
        $user = $request->user();
        if ($user !== null && $user->home_branch_id !== null) {
            return (int) $user->home_branch_id;
        }

        abort(403, 'No active branch resolved for this request.');
    }
}
