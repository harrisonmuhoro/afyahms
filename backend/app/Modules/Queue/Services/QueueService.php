<?php

declare(strict_types=1);

namespace App\Modules\Queue\Services;

use App\Exceptions\Domain\ConflictException;
use App\Exceptions\Domain\ForbiddenException;
use App\Exceptions\Domain\NotFoundException;
use App\Exceptions\Domain\ValidationFailedException;
use App\Models\User;
use App\Modules\Patients\Models\Patient;
use App\Modules\Queue\Models\QueueEvent;
use App\Modules\Queue\Models\QueueStation;
use App\Modules\Queue\Models\QueueTicket;
use App\Modules\Queue\Models\Visit;
use App\Modules\Queue\Repositories\Contracts\QueueRepository;
use App\Support\Sequences\SequenceService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Queue pipeline operations.
 *
 * Pipeline (per docs/17): Reception → Triage → Doctor → Lab → Pharmacy → Billing,
 * skippable per visit type.
 *
 * MTS category drives queue priority via the "mts_category" column on each ticket.
 * Score formula (server-side): orderBy FIELD(mts_category,'red','orange','yellow','green','blue'),
 * then priority, then sequence_value (FIFO within category).
 */
final class QueueService
{
    /** Department → station code mapping (3-letter codes per docs/17). */
    public const STATION_CODES = [
        'reception' => 'REC',
        'triage'    => 'TRI',
        'doctor'    => 'DOC',
        'lab'       => 'LAB',
        'radiology' => 'RAD',
        'pharmacy'  => 'PHA',
        'billing'   => 'BIL',
    ];

    /** Pipeline order per docs/28 §6. */
    public const PIPELINE_ORDER = [
        'REC' => 1,
        'TRI' => 2,
        'DOC' => 3,
        'RAD' => 4,
        'LAB' => 5,
        'PHA' => 6,
        'BIL' => 7,
    ];

    private const ACTIVE_TICKET_STATES = ['issued', 'waiting', 'called', 'in_service', 'held'];

    public function __construct(
        private readonly QueueRepository $queue,
        private readonly SequenceService $sequences,
    ) {}

    /**
     * Open a new visit for a patient in the active branch. Issues the first ticket
     * (at Reception station) atomically. Returns the Visit with its first Ticket.
     *
     * @param array<string,mixed> $visitAttributes patient_id, visit_type, etc.
     */
    public function openVisit(array $visitAttributes, User $actor): Visit
    {
        return DB::transaction(function () use ($visitAttributes, $actor): Visit {
            $branchId = $this->resolveBranchId($actor);
            $patientId = (int) $visitAttributes['patient_id'];

            Patient::query()->whereKey($patientId)->lockForUpdate()->firstOrFail();

            // Validate profile completeness before issuing a ticket
            if (empty($patient->first_name) || empty($patient->last_name) || empty($patient->gender) || empty($patient->date_of_birth)) {
                throw new ValidationFailedException(
                    'Patient profile is incomplete. Basic demographics (name, gender, date of birth) are required before a ticket can be issued.',
                    ['code' => 'INCOMPLETE_PROFILE']
                );
            }

            if ($patient->ageYears() < 18) {
                if (empty($patient->guardian_name) || empty($patient->guardian_national_id) || empty($patient->guardian_relationship)) {
                    throw new ValidationFailedException(
                        'Patient is a minor. Guardian name, relationship, and national ID are required before a ticket can be issued.',
                        ['code' => 'INCOMPLETE_GUARDIAN_DETAILS']
                    );
                }
            } else {
                if (empty($patient->national_id)) {
                    throw new ValidationFailedException(
                        'Adult patients must provide a National ID before a ticket can be issued.',
                        ['code' => 'MISSING_NATIONAL_ID']
                    );
                }
            }

            // Block duplicate open visit on same day.
            $existing = Visit::query()
                ->where('patient_id', $patientId)
                ->where('branch_id', $branchId)
                ->whereIn('status', ['open', 'in_progress'])
                ->whereDate('visit_date', today())
                ->first();
            if ($existing !== null) {
                throw new ConflictException(
                    'Patient already has an open visit today. Open the existing one instead.',
                    409,
                    ['code' => 'DUPLICATE_ACTIVE_VISIT', 'visit_id' => $existing->id],
                );
            }

            $issuedTicket = $this->ticketForPatientOnDate($branchId, $patientId, today()->toDateString());
            if ($issuedTicket !== null) {
                throw new ConflictException(
                    'Patient has already been issued a queue ticket today. Use the existing visit instead.',
                    409,
                    [
                        'code' => 'DUPLICATE_DAILY_TICKET',
                        'ticket_id' => $issuedTicket->id,
                        'ticket_number' => $issuedTicket->ticket_number,
                    ],
                );
            }

            // Generate a human-readable visit number (e.g. VIS-2026-000042).
            // Resets annually; unique per branch per year.
            $visitYear   = Carbon::now()->year;
            $visitNumber = $this->sequences->next(
                scope: "visit:{$branchId}:{$visitYear}",
                prefix: "VIS-{$visitYear}",
                digits: 6,
            );

            /** @var Visit $visit */
            $visit = $this->queue->createVisit([
                'public_id'     => (string) Str::uuid(),
                'visit_number'  => $visitNumber,
                'branch_id'     => $branchId,
                'patient_id'    => $patientId,
                'visit_date'    => today()->toDateString(),
                'visit_type'    => $visitAttributes['visit_type'] ?? 'walk_in',
                'status'        => 'open',
                'registered_by' => $actor->id,
            ]);

            // Issue ticket at Reception (entry station).
            $this->issueTicket($visit, 'REC', $actor, [
                'priority'      => 'normal',
                'reason'        => 'check-in',
            ]);

            $visit->refresh();

            return $visit;
        });
    }

    /**
     * Issue a ticket at a station. Allocates the daily sequence number atomically.
     *
     * @param array<string,mixed> $overrides priority, mts_category, reason
     */
    public function issueTicket(Visit $visit, string $stationCode, User $actor, array $overrides = []): QueueTicket
    {
        return DB::transaction(function () use ($visit, $stationCode, $actor, $overrides): QueueTicket {
            /** @var Visit $visit */
            $visit = Visit::query()->lockForUpdate()->findOrFail($visit->id);
            $branchId = (int) $visit->branch_id;

            /** @var QueueStation|null $station */
            $station = $this->queue->findStationByCode($branchId, $stationCode);
            if ($station === null) {
                throw new NotFoundException("Station {$stationCode} not found in branch.");
            }
            if (! $station->is_active) {
                throw new ConflictException("Station {$stationCode} is inactive.", 409);
            }

            $date = $visit->visit_date instanceof Carbon
                ? $visit->visit_date->toDateString()
                : (string) $visit->visit_date;

            $activeTicket = $this->activeTicketForPatient($branchId, (int) $visit->patient_id, $date);
            if ($activeTicket !== null) {
                throw new ConflictException(
                    'Patient already has an active queue ticket. Complete or cancel the existing ticket before issuing another.',
                    409,
                    [
                        'code' => 'DUPLICATE_ACTIVE_TICKET',
                        'ticket_id' => $activeTicket->id,
                        'ticket_number' => $activeTicket->ticket_number,
                    ],
                );
            }

            // Forward-only rule (docs/28 §6): block if completed ticket exists at same/later pipeline position.
            $targetPosition = self::PIPELINE_ORDER[$stationCode] ?? 99;
            $completedTickets = QueueTicket::query()
                ->where('visit_id', $visit->id)
                ->whereIn('state', ['completed', 'transferred'])
                ->get();

            foreach ($completedTickets as $t) {
                $pos = self::PIPELINE_ORDER[substr($t->ticket_number, 0, 3)] ?? 0;
                if ($pos >= $targetPosition) {
                    if (!($actor->can('queue.void') && $actor->can('queue.override-priority') && !empty($overrides['reason']))) {
                        throw new ValidationFailedException(
                            "Patient has already completed a department at or past {$stationCode} on this visit.",
                            ['code' => 'PIPELINE_FORWARD_ONLY_VIOLATION']
                        );
                    }
                }
            }

            // Daily-reset per-(branch,station,date): scope encodes date, prefix is just
            // the 3-letter department code (e.g. "TRI"). Sequence resets at local midnight.
            $scope = sprintf('queue:%s:%s:%s', $this->branchCode($branchId), $stationCode, $date);
            $prefix = $stationCode;
            $number = $this->sequences->next($scope, $prefix, digits: 3);
            $sequenceValue = (int) substr($number, -3);

            $ticket = $this->queue->createTicket([
                'public_id'      => (string) Str::uuid(),
                'branch_id'      => $branchId,
                'visit_id'       => (int) $visit->id,
                'station_id'     => (int) $station->id,
                'patient_id'     => (int) $visit->patient_id,
                'ticket_number'  => $number,
                'sequence_value' => $sequenceValue,
                'ticket_date'    => $date,
                'priority'       => $overrides['priority'] ?? 'normal',
                'mts_category'   => $overrides['mts_category'] ?? null,
                'state'          => 'waiting',
            ]);

            $visit->update(['current_department' => $stationCode]);

            $this->recordEvent($ticket, 'issued', null, 'waiting', $actor, $overrides);

            return $ticket->refresh();
        });
    }

    /**
     * Mark the next ticket in line at a station as called. Returns the called ticket
     * with `state=called`, `called_at=now`. If a ticket is already in service, throws.
     */
    public function callNext(QueueStation $station, User $actor): QueueTicket
    {
        return DB::transaction(function () use ($station, $actor): QueueTicket {
            $inService = QueueTicket::query()
                ->where('station_id', $station->id)
                ->where('state', 'in_service')
                ->exists();
            if ($inService) {
                throw new ConflictException(
                    'Another ticket is already in service at this station.',
                    409,
                    ['code' => 'STATION_BUSY'],
                );
            }

            $next = $this->queue->waitingAtStation($station->id)
                ->where('state', 'waiting')
                ->sortBy([
                    ['priority', 'asc'],       // emergency < priority < normal in our enum sort
                    ['sequence_value', 'asc'],
                ])
                ->first();

            if ($next === null) {
                throw new NotFoundException('No waiting tickets at this station.');
            }

            /** @var QueueTicket $next */
            $next = $this->queue->ticketForUpdate($next->id);
            $previousState = $next->state;
            $this->queue->updateTicket($next, [
                'state'     => 'called',
                'called_at' => now(),
            ]);

            $this->recordEvent($next, 'called', $previousState, 'called', $actor);

            return $next->refresh();
        });
    }

    /** Begin service on a called ticket. */
    public function startServing(QueueTicket $ticket, User $actor): QueueTicket
    {
        return DB::transaction(function () use ($ticket, $actor): QueueTicket {
            /** @var QueueTicket $ticket */
            $ticket = $this->queue->ticketForUpdate($ticket->id);
            if ($ticket === null) {
                throw new NotFoundException('Ticket not found.');
            }
            if (! in_array($ticket->state, ['called', 'waiting'], true)) {
                throw new ConflictException(
                    "Cannot start serving from state {$ticket->state}.",
                    409,
                    ['code' => 'INVALID_STATE_TRANSITION'],
                );
            }
            $previousState = $ticket->state;
            $this->queue->updateTicket($ticket, [
                'state'     => 'in_service',
                'served_at' => now(),
                'served_by' => $actor->id,
            ]);
            $this->recordEvent($ticket, 'served_start', $previousState, 'in_service', $actor);

            return $ticket->refresh();
        });
    }

    /** Complete a ticket and issue the next-station ticket (if pipeline advances). */
    public function complete(QueueTicket $ticket, User $actor, ?string $nextStationCode = null): QueueTicket
    {
        return DB::transaction(function () use ($ticket, $actor, $nextStationCode): QueueTicket {
            /** @var QueueTicket $ticket */
            $ticket = $this->queue->ticketForUpdate($ticket->id);
            if ($ticket === null) {
                throw new NotFoundException('Ticket not found.');
            }
            if ($ticket->state !== 'in_service') {
                throw new ConflictException(
                    "Ticket must be in_service to complete (currently {$ticket->state}).",
                    409,
                );
            }

            $this->queue->updateTicket($ticket, [
                'state'        => 'completed',
                'completed_at' => now(),
            ]);
            $this->recordEvent($ticket, 'completed', 'in_service', 'completed', $actor);

            // Advance visit: optionally issue a ticket at the next station.
            if ($nextStationCode !== null) {
                $visit = $ticket->visit()->first();
                if ($visit !== null) {
                    $this->issueTicket($visit, $nextStationCode, $actor, [
                        'priority'     => $ticket->priority,
                        'mts_category' => $ticket->mts_category,
                        'reason'       => "advanced from {$ticket->ticket_number}",
                    ]);
                }
            } else {
                // Visit auto-closure at pipeline end (docs/28 §14): system-initiated,
                // no `visits.close` permission required. The visits.status enum has no
                // 'closed' value — the canonical terminal state is 'completed'.
                $visit = $ticket->visit()->first();
                if ($visit !== null) {
                    $visit->update(['status' => 'completed', 'closed_at' => now()]);
                }
            }

            return $ticket->refresh();
        });
    }

    /** Hold / pause a ticket (patient stepped away). */
    public function hold(QueueTicket $ticket, User $actor, ?string $reason = null): QueueTicket
    {
        return DB::transaction(function () use ($ticket, $actor, $reason): QueueTicket {
            /** @var QueueTicket $ticket */
            $ticket = $this->queue->ticketForUpdate($ticket->id);
            $this->queue->updateTicket($ticket, ['state' => 'held']);
            $this->recordEvent($ticket, 'held', $ticket->state, 'held', $actor, ['reason' => $reason]);

            return $ticket->refresh();
        });
    }

    /** Resume a held ticket back into the waiting queue. */
    public function resume(QueueTicket $ticket, User $actor): QueueTicket
    {
        return DB::transaction(function () use ($ticket, $actor): QueueTicket {
            /** @var QueueTicket $ticket */
            $ticket = $this->queue->ticketForUpdate($ticket->id);

            // Calculate hold credit per docs/28 §16
            $holdEvent = $ticket->events()->where('event_type', 'held')->latest('occurred_at')->first();
            $holdDuration = $holdEvent ? now()->diffInSeconds($holdEvent->occurred_at) : 0;
            $holdCredit = min($holdDuration / 2, 5400);

            $this->queue->updateTicket($ticket, ['state' => 'waiting']);
            $this->recordEvent($ticket, 'resumed', 'held', 'waiting', $actor, [
                'hold_duration_seconds' => $holdDuration,
                'hold_credit'           => $holdCredit,
            ]);

            return $ticket->refresh();
        });
    }

    /** Mark a ticket no-show. */
    public function markNoShow(QueueTicket $ticket, User $actor, ?string $reason = null): QueueTicket
    {
        return DB::transaction(function () use ($ticket, $actor, $reason): QueueTicket {
            /** @var QueueTicket $ticket */
            $ticket = $this->queue->ticketForUpdate($ticket->id);
            $this->queue->updateTicket($ticket, [
                'state'        => 'no_show',
                'completed_at' => now(),
            ]);
            $this->recordEvent($ticket, 'no_show', $ticket->state, 'no_show', $actor, ['reason' => $reason]);

            return $ticket->refresh();
        });
    }

    /** Emergency bypass: jump ticket to the front of its current station. */
    public function emergencyBypass(QueueTicket $ticket, User $actor, ?string $reason = null): QueueTicket
    {
        return DB::transaction(function () use ($ticket, $actor, $reason): QueueTicket {
            /** @var QueueTicket $ticket */
            $ticket = $this->queue->ticketForUpdate($ticket->id);
            $this->queue->updateTicket($ticket, [
                'priority'     => 'emergency',
                'mts_category' => 'red',
            ]);
            $this->recordEvent($ticket, 'preempted', $ticket->priority, 'emergency', $actor, [
                'reason'       => $reason ?? 'emergency bypass',
                'mts_category' => 'red',
            ]);

            return $ticket->refresh();
        });
    }

    /** Update MTS category and propagate to queue priority. */
    public function updateMtsCategory(QueueTicket $ticket, string $category, User $actor, ?string $reason = null): QueueTicket
    {
        return DB::transaction(function () use ($ticket, $category, $actor, $reason): QueueTicket {
            /** @var QueueTicket $ticket */
            $ticket = $this->queue->ticketForUpdate($ticket->id);
            $this->queue->updateTicket($ticket, [
                'mts_category' => $category,
                'priority'     => $category === 'red' ? 'emergency' : ($category === 'orange' ? 'priority' : $ticket->priority),
            ]);
            $this->recordEvent($ticket, 'reranked', $ticket->mts_category, $category, $actor, [
                'reason' => $reason,
            ]);

            return $ticket->refresh();
        });
    }

    /**
     * Snapshot of the board at a station: waiting + currently-in-service.
     *
     * @return array{station: QueueStation, waiting: \Illuminate\Support\Collection, in_service: ?QueueTicket}
     */
    public function boardSnapshot(QueueStation $station): array
    {
        $all = $this->queue->waitingAtStation($station->id);
        $inService = $all->firstWhere('state', 'in_service');

        // FIFO within MTS category; priority within same category.
        $waiting = $all->where('state', '!=', 'in_service')
            ->sortBy([
                fn ($a, $b) => $this->mtsWeight($a->mts_category) <=> $this->mtsWeight($b->mts_category),
                fn ($a, $b) => $a->sequence_value <=> $b->sequence_value,
            ])
            ->values();

        return [
            'station'    => $station,
            'waiting'    => $waiting,
            'in_service' => $inService,
        ];
    }

    private function mtsWeight(?string $category): int
    {
        return match ($category) {
            'red'    => 0,
            'orange' => 1,
            'yellow' => 2,
            'green'  => 3,
            'blue'   => 4,
            default  => 5,
        };
    }

    /** Public accessor used by QueueController::stations (single branch). */
    public function listActiveStationsInternal(int $branchId): \Illuminate\Support\Collection
    {
        return $this->queue->listActiveStations($branchId);
    }

    private function recordEvent(
        QueueTicket $ticket,
        string $eventType,
        ?string $fromState,
        ?string $toState,
        User $actor,
        array $overrides = [],
    ): QueueEvent {
        return $this->queue->createEvent([
            'branch_id'      => $ticket->branch_id,
            'queue_ticket_id'=> $ticket->id,
            'station_id'     => $ticket->station_id,
            'actor_user_id'  => $actor->id,
            'event_type'     => $eventType,
            'from_state'     => $fromState,
            'to_state'       => $toState,
            'mts_category'   => $overrides['mts_category'] ?? $ticket->mts_category,
            'reason'         => $overrides['reason'] ?? null,
            'metadata'       => $overrides['metadata'] ?? null,
            'occurred_at'    => now(),
        ]);
    }

    private function resolveBranchId(User $actor): int
    {
        $active = app(\App\Modules\Tenancy\Services\BranchContext::class)->get();
        if ($active !== null) {
            return $active;
        }
        if ($actor->home_branch_id !== null) {
            return (int) $actor->home_branch_id;
        }
        throw new ForbiddenException('No active branch resolved for this request.');
    }

    private function branchCode(int $branchId): string
    {
        return (string) (\App\Modules\Tenancy\Models\Branch::query()->find($branchId)?->code ?? 'NRB');
    }

    private function activeTicketForPatient(int $branchId, int $patientId, string $date, ?int $stationId = null): ?QueueTicket
    {
        return QueueTicket::query()
            ->where('branch_id', $branchId)
            ->where('patient_id', $patientId)
            ->whereDate('ticket_date', $date)
            ->whereIn('state', self::ACTIVE_TICKET_STATES)
            ->when($stationId !== null, fn ($query) => $query->where('station_id', $stationId))
            ->lockForUpdate()
            ->orderByDesc('id')
            ->first();
    }

    private function ticketForPatientOnDate(int $branchId, int $patientId, string $date): ?QueueTicket
    {
        return QueueTicket::query()
            ->where('branch_id', $branchId)
            ->where('patient_id', $patientId)
            ->whereDate('ticket_date', $date)
            ->lockForUpdate()
            ->orderByDesc('id')
            ->first();
    }
}
