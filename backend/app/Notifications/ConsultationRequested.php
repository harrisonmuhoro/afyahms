<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use App\Modules\Queue\Models\QueueTicket;

class ConsultationRequested extends Notification
{
    use Queueable;

    public $ticket;

    public function __construct(QueueTicket $ticket)
    {
        $this->ticket = $ticket;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $stationName = $this->ticket->station ? $this->ticket->station->name : 'Unknown Station';

        return [
            'title' => 'Consultation Requested',
            'message' => "A patient has been routed to {$stationName}. Please check your queue.",
            'icon' => 'queue',
            'ticket_id' => $this->ticket->id,
        ];
    }
}
