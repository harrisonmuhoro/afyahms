<?php

declare(strict_types=1);

namespace App\Modules\PatientPortal\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Messages\Models\Conversation;
use App\Modules\Messages\Services\MessageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PortalMessageController extends Controller
{
    public function __construct(
        private readonly MessageService $messageService,
    ) {}

    /**
     * List all conversations the authenticated patient participates in.
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();

        $conversations = $user->conversations()
            ->with(['users' => fn ($q) => $q->select('users.id', 'first_name', 'last_name', 'role')])
            ->withCount(['messages as unread_count' => function ($query) use ($user) {
                $query->whereColumn('messages.created_at', '>', 'conversation_user.last_read_at')
                      ->whereColumn('messages.sender_id', '!=', \Illuminate\Support\Facades\DB::raw($user->id));
            }])
            ->withMax('messages', 'created_at')
            ->orderByDesc('messages_max_created_at')
            ->paginate($request->integer('per_page', 20));

        return response()->json($conversations);
    }

    /**
     * Fetch all messages for a specific conversation.
     */
    public function show(Conversation $conversation): JsonResponse
    {
        // Ensure the patient is a participant
        if (! $conversation->users()->where('users.id', Auth::id())->exists()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $this->messageService->markAsRead($conversation);

        $messages = $conversation->messages()
            ->with('sender:id,first_name,last_name')
            ->oldest()
            ->get();

        return response()->json([
            'conversation' => $conversation->load('users:id,first_name,last_name'),
            'messages'     => $messages,
        ]);
    }

    /**
     * Send a new message (creates conversation if conversation_id not given).
     * Patients always send to a default "support" staff user or hospital inbox.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subject'         => ['nullable', 'string', 'max:200'],
            'body'            => ['required', 'string', 'max:5000'],
            'conversation_id' => ['nullable', 'string', 'exists:conversations,id'],
            'recipient_ids'   => ['nullable', 'array'],
            'recipient_ids.*' => ['integer', 'exists:users,id'],
        ]);

        // If no recipient supplied, route to the hospital support queue (user ID 1 as fallback)
        if (empty($data['conversation_id']) && empty($data['recipient_ids'])) {
            $data['recipient_ids'] = [1]; // Hospital support user
        }

        $message = $this->messageService->sendMessage($data);

        return response()->json([
            'message' => 'Message sent.',
            'data'    => $message->load('sender:id,first_name,last_name', 'conversation'),
        ], 201);
    }
}
