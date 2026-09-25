<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Modules\Appointments\Models\Appointment;
use App\Modules\Appointments\Requests\StorePortalAppointmentRequest;
use App\Modules\Appointments\Resources\AppointmentResource;
use App\Modules\Appointments\Resources\AppointmentCollection;
use App\Modules\Appointments\Resources\DoctorScheduleResource;
use App\Modules\Appointments\Services\AppointmentService;
use App\Modules\Appointments\Services\SlotGeneratorService;
use App\Modules\Appointments\Models\DoctorSchedule;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PatientAppointmentController extends Controller
{
    public function __construct(
        private readonly AppointmentService $appointmentService,
        private readonly SlotGeneratorService $slotService
    ) {}

    public function index(Request $request): AppointmentCollection
    {
        $patientId = $this->patientId($request);

        $appointments = Appointment::with(['patient', 'doctor', 'branch'])
            ->where('patient_id', $patientId)
            ->orderBy('appointment_date', 'desc')
            ->orderBy('start_time', 'desc')
            ->paginate(15);

        return new AppointmentCollection($appointments);
    }

    public function doctors(): JsonResponse
    {
        // Return active doctors who have at least one active schedule
        $doctors = User::whereHas('roles', fn($q) => $q->where('name', 'doctor'))
            ->whereHas('doctorSchedules', fn($q) => $q->where('is_active', true))
            ->select('id', 'name', 'specialization')
            ->get();

        return response()->json(['data' => $doctors]);
    }

    /**
     * List only active schedules that patients can use for self-booking.
     */
    public function schedules(Request $request)
    {
        $this->patientId($request);

        $schedules = DoctorSchedule::with(['doctor', 'branch', 'timeBlocks'])
            ->where('is_active', true)
            ->whereDate('valid_from', '<=', today())
            ->where(function ($query) {
                $query->whereNull('valid_until')
                    ->orWhereDate('valid_until', '>=', today());
            })
            ->when($request->branch_id, fn ($query, $branchId) => $query->where('branch_id', $branchId))
            ->orderBy('name')
            ->get();

        return DoctorScheduleResource::collection($schedules);
    }

    public function slots(Request $request): JsonResponse
    {
        $this->patientId($request);

        $request->validate([
            'doctor_id' => ['required', 'exists:users,id'],
            'branch_id' => ['required', 'exists:branches,id'],
            'schedule_id' => ['required', 'exists:doctor_schedules,id'],
            'date' => ['required', 'date', 'after_or_equal:today'],
        ]);

        $slots = $this->slotService->getAvailableSlots(
            (int) $request->doctor_id,
            Carbon::parse($request->date),
            (int) $request->branch_id,
            (string) $request->schedule_id,
        );

        return response()->json(['data' => $slots]);
    }

    public function store(StorePortalAppointmentRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['patient_id'] = $this->patientId($request);
        $data['booked_via'] = 'patient_portal';

        try {
            $appointment = $this->appointmentService->book($data);
            return response()->json([
                'message' => 'Appointment booked successfully.',
                'appointment' => new AppointmentResource($appointment->load(['patient', 'doctor', 'branch'])),
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function cancel(Request $request, Appointment $appointment): JsonResponse
    {
        if ((int) $appointment->patient_id !== $this->patientId($request)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $request->validate(['reason' => 'nullable|string|max:255']);

        // Patient cancellation is blocked inside the configurable branch policy window.
        $startsAt = $appointment->appointment_date->setTimeFromTimeString($appointment->start_time);
        $windowHours = (int) ($appointment->branch?->appointment_cancellation_window_hours
            ?? config('appointments.patient_cancellation_window_hours', 2));
        if (now()->diffInHours($startsAt, false) < $windowHours) {
            return response()->json(["message" => "Cannot cancel within {$windowHours} hours of appointment. Please call the clinic."], 422);
        }

        $this->appointmentService->cancel($appointment, $request->reason);

        return response()->json(['message' => 'Appointment cancelled.']);
    }

    private function patientId(Request $request): int
    {
        $patient = $request->user()?->patient;

        abort_unless($patient !== null, 403, 'No patient record is linked to this account.');

        return (int) $patient->id;
    }
}
