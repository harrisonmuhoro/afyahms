<?php

declare(strict_types=1);

namespace App\Modules\PatientPortal\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Appointments\Models\Appointment;
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
            ->with(['users' => fn ($q) => $q->select('users.id', 'name')])
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
            ->with('sender:id,name')
            ->oldest()
            ->get();

        return response()->json([
            'conversation' => $conversation->load('users:id,name'),
            'messages'     => $messages,
        ]);
    }

    public function recipients(): JsonResponse
    {
        $patientId = Auth::user()?->patient?->id;
        abort_unless($patientId !== null, 403, 'No patient record is linked to this account.');

        $doctorIds = Appointment::where('patient_id', $patientId)
            ->whereNotNull('doctor_id')->distinct()->pluck('doctor_id');
        $doctors = User::whereIn('id', $doctorIds)->where('is_active', true)
            ->whereHas('roles', fn ($q) => $q->where('name', 'doctor'))
            ->get(['id', 'name', 'email'])->map(fn (User $user) => [
                'id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'role' => 'Doctor',
            ]);
        $support = User::where('is_active', true)
            ->whereHas('roles', fn ($q) => $q->whereIn('name', ['receptionist', 'hospital-admin']))
            ->get(['id', 'name', 'email'])->map(fn (User $user) => [
                'id' => $user->id, 'name' => $user->name, 'email' => $user->email,
                'role' => $user->getRoleNames()->first() ?? 'Hospital Support',
            ]);

        return response()->json(['data' => $doctors->concat($support)->unique('id')->values()]);
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
            'conversation_id' => ['nullable', 'string'],
            'recipient_ids'   => ['nullable', 'array'],
            'recipient_ids.*' => ['integer', 'exists:users,id'],
        ]);

        // If no recipient supplied, route to the hospital support queue (user ID 1 as fallback)
        if (empty($data['conversation_id']) && empty($data['recipient_ids'])) {
            $data['recipient_ids'] = [1]; // Hospital support user
        }

        if (! empty($data['conversation_id'])) {
            $conversation = Conversation::where('public_id', $data['conversation_id'])->first();
            if (! $conversation && ctype_digit((string) $data['conversation_id'])) {
                $conversation = Conversation::find((int) $data['conversation_id']);
            }

            if (! $conversation || ! $conversation->users()->whereKey(Auth::id())->exists()) {
                return response()->json(['message' => 'This conversation is not available.'], 422);
            }

            // MessageService uses the database primary key internally.
            $data['conversation_id'] = (string) $conversation->getKey();
        }

        $message = $this->messageService->sendMessage($data);

        return response()->json([
            'message' => 'Message sent.',
            'data'    => $message->load('sender:id,name', 'conversation'),
        ], 201);
    }
}
