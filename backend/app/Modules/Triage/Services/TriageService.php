<?php

declare(strict_types=1);

namespace App\Modules\Triage\Services;

use App\Exceptions\Domain\ConflictException;
use App\Exceptions\Domain\ValidationFailedException;
use App\Models\User;
use App\Modules\Queue\Models\QueueTicket;
use App\Modules\Queue\Repositories\Contracts\QueueRepository;
use App\Modules\Queue\Services\QueueService;
use App\Modules\Triage\Models\TriageAssessment;
use App\Modules\Triage\Repositories\Contracts\TriageRepository;
use Illuminate\Support\Facades\DB;

/**
 * Records triage vitals + MTS category. Propagates the category to the active
 * queue ticket (which reorders the station board).
 */
final class TriageService
{
    public function __construct(
        private readonly TriageRepository $triage,
        private readonly QueueService $queueService,
        private readonly QueueRepository $queue,
    ) {}

    /**
     * @param array<string,mixed> $attributes mts_level, vitals, complaint, notes
     */
    public function recordAssessment(int $visitId, array $attributes, User $actor): TriageAssessment
    {
        return DB::transaction(function () use ($visitId, $attributes, $actor): TriageAssessment {
            $visit = $this->queue->findVisit($visitId);
            if ($visit === null) {
                throw new \App\Exceptions\Domain\NotFoundException('Visit not found.');
            }

            // Triage assessment must occur while the visit is at the TRI station.
            $ticket = $this->queue->findTicketForVisit($visitId, 'waiting')
                ?? $this->queue->findTicketForVisit($visitId, 'in_service')
                ?? $this->queue->findTicketForVisit($visitId, 'called')
                ?? $this->queue->findTicketForVisit($visitId, 'issued');

            if ($ticket === null) {
                throw new ConflictException(
                    'No active queue ticket for this visit. Issue a triage ticket first.',
                    409,
                    ['code' => 'NO_ACTIVE_TICKET'],
                );
            }

            /** @var QueueTicket $ticket */
            $mtsCategory = (string) $attributes['mts_level'];
            if (! in_array($mtsCategory, ['red', 'orange', 'yellow', 'green', 'blue'], true)) {
                throw new ValidationFailedException("Invalid MTS level: {$mtsCategory}");
            }

            /** @var TriageAssessment $assessment */
            $assessment = $this->triage->createAssessment([
                'public_id'        => (string) \Illuminate\Support\Str::uuid(),
                'branch_id'        => $visit->branch_id,
                'patient_id'       => $visit->patient_id,
                'visit_id'         => $visit->id,
                'queue_ticket_id'  => $ticket->id,
                'mts_level'        => $mtsCategory,
                'chief_complaint'  => $attributes['chief_complaint'] ?? null,
                'temperature_c'    => $attributes['temperature_c'] ?? null,
                'pulse_bpm'        => $attributes['pulse_bpm'] ?? null,
                'respiratory_rate' => $attributes['respiratory_rate'] ?? null,
                'systolic_bp'      => $attributes['systolic_bp'] ?? null,
                'diastolic_bp'     => $attributes['diastolic_bp'] ?? null,
                'spo2_pct'         => $attributes['spo2_pct'] ?? null,
                'weight_kg'        => $attributes['weight_kg'] ?? null,
                'height_cm'        => $attributes['height_cm'] ?? null,
                'bmi'              => $attributes['bmi'] ?? null,
                'pain_score'       => $attributes['pain_score'] ?? null,
                'notes'            => $attributes['notes'] ?? null,
                'assessed_by'      => $actor->id,
            ]);

            // Propagate category to the queue ticket so the board reorders.
            $this->queueService->updateMtsCategory($ticket, $mtsCategory, $actor, 'triage assessment');

            // If Red (immediate), auto-emit emergency bypass event.
            if ($mtsCategory === 'red') {
                $this->queueService->emergencyBypass($ticket, $actor, 'MTS Red at triage');
            }

            return $assessment->refresh();
        });
    }
}
