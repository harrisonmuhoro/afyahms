<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Modules\Appointments\Models\Appointment;
use App\Modules\Appointments\Requests\BookAppointmentRequest;
use App\Modules\Appointments\Resources\AppointmentResource;
use App\Modules\Appointments\Resources\AppointmentCollection;
use App\Modules\Appointments\Services\AppointmentService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PatientAppointmentController extends Controller
{
    public function __construct(
        private readonly AppointmentService $appointmentService
    ) {}

    public function index(Request $request): AppointmentCollection
    {
        // For patient portal, we must strictly scope to their own appointments
        $patientId = $request->user()->patient_id;

        $appointments = Appointment::with(['doctor', 'branch'])
            ->where('patient_id', $patientId)
            ->orderBy('appointment_date', 'desc')
            ->orderBy('start_time', 'desc')
            ->paginate(15);

        return new AppointmentCollection($appointments);
    }

    public function store(BookAppointmentRequest $request): JsonResponse
    {
        // Enforce patient can only book for themselves
        $patientId = $request->user()->patient_id;
        
        $data = $request->validated();
        if ($data['patient_id'] !== $patientId) {
            return response()->json(['message' => 'Unauthorized patient ID.'], 403);
        }

        $data['booked_via'] = 'patient_portal';

        try {
            $appointment = $this->appointmentService->book($data);
            return response()->json([
                'message' => 'Appointment booked successfully.',
                'appointment' => new AppointmentResource($appointment->load(['doctor', 'branch'])),
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function cancel(Request $request, Appointment $appointment): JsonResponse
    {
        // Authorize patient owns the appointment
        if ($appointment->patient_id !== $request->user()->patient_id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $request->validate(['reason' => 'nullable|string|max:255']);

        // Check if within 24 hours
        $startsAt = $appointment->appointment_date->setTimeFromTimeString($appointment->start_time);
        if (now()->diffInHours($startsAt, false) < 24) {
            return response()->json(['message' => 'Cannot cancel within 24 hours of appointment. Please call the clinic.'], 422);
        }

        $this->appointmentService->cancel($appointment, $request->reason);

        return response()->json(['message' => 'Appointment cancelled.']);
    }
}
