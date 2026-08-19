<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Appointments\Models\Appointment;
use App\Modules\Appointments\Requests\StoreAppointmentRequest;
use App\Modules\Appointments\Services\AppointmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AppointmentController extends Controller
{
    public function __construct(
        private readonly AppointmentService $appointmentService
    ) {}

    public function index(Request $request): JsonResponse
    {
        // Simple index, you could add filtering by doctor_id, patient_id, branch_id etc.
        $appointments = Appointment::with(['patient', 'doctor', 'branch'])
            ->orderBy('appointment_date', 'asc')
            ->paginate($request->get('per_page', 15));

        return response()->json($appointments);
    }

    public function store(StoreAppointmentRequest $request): JsonResponse
    {
        $appointment = $this->appointmentService->createAppointment($request->validated());

        return response()->json([
            'message' => 'Appointment booked successfully.',
            'appointment' => $appointment->load(['patient', 'doctor', 'branch']),
        ], 201);
    }

    public function show(Appointment $appointment): JsonResponse
    {
        return response()->json($appointment->load(['patient', 'doctor', 'branch']));
    }
}
