<?php

declare(strict_types=1);

namespace App\Modules\Patients\Services;

use App\Exceptions\Domain\ConflictException;
use App\Exceptions\Domain\ForbiddenException;
use App\Models\User;
use App\Modules\Audit\Services\AuditLogService;
use App\Modules\Patients\Models\DataCorrectionRequest;
use App\Modules\Patients\Models\Patient;
use App\Notifications\DataCorrectionReviewedNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class DataCorrectionRequestService
{
    public function __construct(private readonly AuditLogService $audit) {}

    /** @param array<string, mixed> $attributes */
    public function createForPatient(Patient $patient, User $actor, array $attributes, ?Request $request = null): DataCorrectionRequest
    {
        if ($actor->hasRole('patient') && $patient->portal_user_id !== $actor->id) {
            throw new ForbiddenException('You can only request corrections for your own patient record.');
        }

        if (! $actor->hasRole('patient') && ! $actor->can('data-corrections.create')) {
            throw new ForbiddenException('You are not allowed to submit data correction requests.');
        }

        return DB::transaction(function () use ($patient, $actor, $attributes, $request): DataCorrectionRequest {
            $row = DataCorrectionRequest::query()->create([
                'branch_id' => $patient->branch_id,
                'patient_id' => $patient->id,
                'requested_by' => $actor->id,
                'record_type' => (string) $attributes['record_type'],
                'record_id' => $attributes['record_id'] ?? null,
                'field_name' => $attributes['field_name'] ?? null,
                'requested_value' => $attributes['requested_value'] ?? null,
                'reason' => (string) $attributes['reason'],
                'status' => DataCorrectionRequest::STATUS_PENDING,
            ]);

            $this->audit->record(
                event: 'data_correction.requested',
                actor: $actor,
                request: $request,
                subject: $row,
                context: [
                    'action' => 'created',
                    'patient_id' => $patient->id,
                    'record_type' => $row->record_type,
                    'record_id' => $row->record_id,
                    'field_name' => $row->field_name,
                ],
            );

            return $row->fresh(['patient']);
        });
    }

    public function review(DataCorrectionRequest $row, User $reviewer, string $status, string $reason, ?Request $request = null): DataCorrectionRequest
    {
        if (! in_array($status, [DataCorrectionRequest::STATUS_APPROVED, DataCorrectionRequest::STATUS_REJECTED], true)) {
            throw new ConflictException('Correction request review must approve or reject the request.', 422);
        }

        if ($row->status !== DataCorrectionRequest::STATUS_PENDING) {
            throw new ConflictException('This correction request has already been reviewed.', 409);
        }

        $reviewed = DB::transaction(function () use ($row, $reviewer, $status, $reason, $request): DataCorrectionRequest {
            $row->forceFill([
                'status' => $status,
                'reviewed_by' => $reviewer->id,
                'review_reason' => $reason,
                'reviewed_at' => now(),
            ])->save();

            $this->audit->record(
                event: 'data_correction.reviewed',
                actor: $reviewer,
                request: $request,
                subject: $row,
                context: [
                    'action' => $status,
                    'review_reason' => $reason,
                ],
            );

            return $row->fresh(['patient', 'requester']);
        });

        $reviewed->requester?->notify(new DataCorrectionReviewedNotification($reviewed, $reviewer));

        return $reviewed;
    }
}
