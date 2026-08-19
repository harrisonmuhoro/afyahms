<?php

declare(strict_types=1);

namespace App\Modules\Messages\Services;

use App\Modules\Messages\Models\Conversation;
use App\Modules\Messages\Models\Message;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class MessageService
{
    public function sendMessage(array $data): Message
    {
        return DB::transaction(function () use ($data) {
            $senderId = Auth::id();

            if (isset($data['conversation_id'])) {
                $conversation = Conversation::findOrFail($data['conversation_id']);
            } else {
                $conversation = Conversation::create(['subject' => $data['subject'] ?? null]);
                
                $participantIds = array_unique(array_merge([$senderId], $data['recipient_ids']));
                $conversation->users()->attach($participantIds);
            }

            $message = $conversation->messages()->create([
                'sender_id' => $senderId,
                'body' => $data['body'],
            ]);

            // Mark as read for sender
            $conversation->users()->updateExistingPivot($senderId, ['last_read_at' => now()]);

            return $message;
        });
    }

    public function markAsRead(Conversation $conversation): void
    {
        $conversation->users()->updateExistingPivot(Auth::id(), ['last_read_at' => now()]);
    }
}
