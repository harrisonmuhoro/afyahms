<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use App\Modules\Triage\Models\TriageAssessment;

class CriticalVitalsAlert extends Notification
{
    use Queueable;

    public $assessment;

    /**
     * Create a new notification instance.
     */
    public function __construct(TriageAssessment $assessment)
    {
        $this->assessment = $assessment;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Critical Vitals Alert',
            'message' => "Urgent: Critical vitals recorded for patient. Please review immediately.",
            'icon' => 'alertCircle',
            'assessment_id' => $this->assessment->id
        ];
    }
}
