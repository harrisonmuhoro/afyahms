<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use App\Models\User;

class NewStaffAdded extends Notification
{
    use Queueable;

    public $newUser;

    public function __construct(User $newUser)
    {
        $this->newUser = $newUser;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'New Staff Member Added',
            'message' => "A new staff member, {$this->newUser->name}, has been added to the system.",
            'icon' => 'userPlus',
            'user_id' => $this->newUser->id,
        ];
    }
}
