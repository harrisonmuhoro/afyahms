<?php

declare(strict_types=1);

namespace Tests\Feature\Appointments;

use App\Modules\Appointments\Models\Appointment;
use App\Modules\Tenancy\Models\Branch;
use App\Models\User;
use App\Modules\Patients\Models\Patient;
use App\Modules\Queue\Models\Visit;
use App\Modules\Emr\Models\Encounter;
use App\Modules\Appointments\Services\AppointmentService;
use App\Modules\Emr\Services\EmrService;
use Carbon\Carbon;
use Tests\TestCase;
use Illuminate\Support\Str;

class AppointmentIntegrationTest extends TestCase
{
    private User $doctor;
    private Patient $patient;
    private Branch $branch;
    private Appointment $appointment;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate:fresh');

        $this->branch = Branch::create([
            'code' => 'TST', 'name' => 'Test Branch', 'is_active' => true,
        ]);
        app()->instance('active_branch_id', $this->branch->id);
        
        $this->doctor = User::factory()->create([
            'home_branch_id' => $this->branch->id,
            'current_branch_id' => $this->branch->id,
        ]);
        $this->doctor->assignRole('doctor');

        $this->patient = Patient::create([
            'public_id' => Str::uuid()->toString(),
            'branch_id' => $this->branch->id,
            'first_name' => 'John',
            'last_name' => 'Doe',
            'date_of_birth' => '1990-01-01',
            'gender' => 'M',
            'phone' => '+1234567890',
            'patient_number' => 'PAT-2026-000003',
        ]);

        $this->appointment = Appointment::create([
            'public_id' => Str::uuid()->toString(),
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'branch_id' => $this->branch->id,
            'appointment_date' => Carbon::now()->toDateString(),
            'start_time' => '10:00:00',
            'end_time' => '10:30:00',
            'status' => 'confirmed',
            'type' => 'new_patient',
            'booked_by' => $this->doctor->id,
            'appointment_number' => 'APT-2026-0003',
        ]);
    }

    public function test_check_in_creates_queue_visit(): void
    {
        $receptionist = User::factory()->create([
            'home_branch_id' => $this->branch->id,
            'current_branch_id' => $this->branch->id,
        ]);
        $receptionist->assignRole('receptionist');

        $response = $this->actingAs($receptionist)->patchJson("/api/v1/appointments/{$this->appointment->public_id}/check-in");
        $response->assertStatus(200);

        $this->assertDatabaseHas('appointments', [
            'public_id' => $this->appointment->public_id,
            'status' => 'checked_in',
        ]);

        $this->assertDatabaseHas('visits', [
            'patient_id' => $this->patient->id,
            'branch_id' => $this->branch->id,
            'status' => 'waiting',
        ]);
    }

    public function test_emr_completion_marks_appointment_completed(): void
    {
        // Set up an encounter linked to the appointment
        $encounter = Encounter::create([
            'branch_id' => $this->branch->id,
            'patient_id' => $this->patient->id,
            'provider_id' => $this->doctor->id,
            'appointment_id' => $this->appointment->id,
            'status' => 'in_progress',
            'started_at' => now(),
        ]);

        $emrService = app(EmrService::class);
        $emrService->completeEncounter($encounter->id, 'discharged', $this->doctor);

        $this->assertDatabaseHas('appointments', [
            'id' => $this->appointment->id,
            'status' => 'completed',
        ]);
    }
}
