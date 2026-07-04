<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\User;
use App\Modules\Patients\Models\DataCorrectionRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

final class DataCorrectionReviewedNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly DataCorrectionRequest $correctionRequest,
        private readonly User $reviewer,
    ) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'data_correction_reviewed',
            'message' => 'Your data correction request has been reviewed.',
            'correction_request_id' => $this->correctionRequest->public_id,
            'patient_id' => $this->correctionRequest->patient?->public_id,
            'record_type' => $this->correctionRequest->record_type,
            'field_name' => $this->correctionRequest->field_name,
            'status' => $this->correctionRequest->status,
            'review_reason' => $this->correctionRequest->review_reason,
            'reviewed_at' => $this->correctionRequest->reviewed_at?->toIso8601String(),
            'reviewer_id' => $this->reviewer->id,
            'reviewer_name' => $this->reviewer->name,
        ];
    }
}
