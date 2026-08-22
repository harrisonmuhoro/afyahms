<?php

declare(strict_types=1);

namespace App\Modules\Messages\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Messages\Models\Conversation;
use App\Modules\Messages\Requests\StoreMessageRequest;
use App\Modules\Messages\Services\MessageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MessageController extends Controller
{
    public function __construct(
        private readonly MessageService $messageService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();

        $conversations = $user->conversations()
            ->with(['users' => function($q) {
                $q->select('users.id', 'name');
            }])
            ->withCount(['messages as unread_count' => function ($query) use ($user) {
                // Approximate unread count based on created_at vs last_read_at
                $query->whereColumn('created_at', '>', 'conversation_user.last_read_at');
            }])
            ->orderByDesc('updated_at')
            ->paginate($request->get('per_page', 15));

        return response()->json($conversations);
    }

    public function show(Conversation $conversation): JsonResponse
    {
        // Ensure user is part of conversation
        if (!$conversation->users()->where('users.id', Auth::id())->exists()) {
            return response()->json(['message' => 'Unauthorized access to conversation.'], 403);
        }

        $this->messageService->markAsRead($conversation);

        $messages = $conversation->messages()
            ->with('sender:id,name')
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json([
            'conversation' => $conversation->load('users:id,name'),
            'messages' => $messages,
        ]);
    }

    public function store(StoreMessageRequest $request): JsonResponse
    {
        $message = $this->messageService->sendMessage($request->validated());

        return response()->json([
            'message' => 'Message sent successfully.',
            'data' => $message->load('sender:id,name'),
        ], 201);
    }
}
