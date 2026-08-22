<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Appointments\Models\Appointment;
use App\Modules\Appointments\Requests\BookAppointmentRequest;
use App\Modules\Appointments\Requests\RescheduleAppointmentRequest;
use App\Modules\Appointments\Resources\AppointmentResource;
use App\Modules\Appointments\Resources\AppointmentCollection;
use App\Modules\Appointments\Services\AppointmentService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AppointmentController extends Controller
{
    public function __construct(
        private readonly AppointmentService $appointmentService
    ) {
        // Note: authorizeResource() removed – incompatible with Laravel 11
        // (it internally calls $this->middleware() which no longer exists).
        // Per-action $this->authorize() calls are used instead.
    }

    public function index(Request $request): AppointmentCollection
    {
        $this->authorize('viewAny', Appointment::class);

        $query = Appointment::with(['patient', 'doctor', 'branch', 'schedule'])
            ->when($request->date, fn ($q, $date) => $q->where('appointment_date', $date))
            ->when($request->doctor_id, fn ($q, $id) => $q->where('doctor_id', $id))
            ->when($request->branch_id, fn ($q, $id) => $q->where('branch_id', $id))
            ->when($request->status, fn ($q, $status) => $q->where('status', $status))
            ->when($request->from, fn ($q, $from) => $q->where('appointment_date', '>=', substr($from, 0, 10)));

        return new AppointmentCollection(
            $query->orderBy('appointment_date')->orderBy('start_time')->paginate(
                min(100, max(1, (int) $request->integer('per_page', 100)))
            )
        );
    }

    public function store(BookAppointmentRequest $request): JsonResponse
    {
        $this->authorize('create', Appointment::class);
        try {
            $appointment = $this->appointmentService->book($request->validated());
            return response()->json([
                'message' => 'Appointment booked successfully.',
                'appointment' => new AppointmentResource($appointment->load(['patient', 'doctor', 'branch'])),
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function show(Appointment $appointment): AppointmentResource
    {
        return new AppointmentResource($appointment->load([
            'patient', 'doctor', 'branch', 'schedule', 'bookedBy', 'cancelledBy',
        ]));
    }

    public function reschedule(RescheduleAppointmentRequest $request, Appointment $appointment): JsonResponse
    {
        $this->authorize('update', $appointment);

        try {
            $newAppointment = $this->appointmentService->reschedule($appointment, $request->validated());
            return response()->json([
                'message' => 'Appointment rescheduled successfully.',
                'appointment' => new AppointmentResource($newAppointment->load(['patient', 'doctor', 'branch'])),
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function cancel(Request $request, Appointment $appointment): JsonResponse
    {
        $this->authorize('update', $appointment);
        $request->validate(['reason' => 'nullable|string|max:255']);

        $this->appointmentService->cancel($appointment, $request->reason);

        return response()->json(['message' => 'Appointment cancelled.']);
    }

    public function confirm(Appointment $appointment): JsonResponse
    {
        $this->authorize('update', $appointment);
        $this->appointmentService->confirm($appointment);
        
        return response()->json(['message' => 'Appointment confirmed.']);
    }

    public function checkIn(Appointment $appointment): JsonResponse
    {
        $this->authorize('update', $appointment);
        $this->appointmentService->checkIn($appointment);
        
        return response()->json(['message' => 'Patient checked in.']);
    }
}
