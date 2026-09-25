<?php

declare(strict_types=1);

namespace Tests\Feature\Appointments;

use App\Modules\Appointments\Models\Appointment;
use App\Modules\Appointments\Models\DoctorSchedule;
use App\Modules\Appointments\Models\ScheduleTimeBlock;
use App\Modules\Tenancy\Models\Branch;
use App\Models\User;
use App\Modules\Patients\Models\Patient;
use Carbon\Carbon;
use Tests\TestCase;
use Illuminate\Support\Str;

class AppointmentActionsTest extends TestCase
{
    private User $receptionist;
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
        
        $doctor = User::factory()->create([
            'home_branch_id' => $this->branch->id,
            'current_branch_id' => $this->branch->id,
        ]);
        $doctor->assignRole('doctor');

        $this->receptionist = User::factory()->create([
            'home_branch_id' => $this->branch->id,
            'current_branch_id' => $this->branch->id,
        ]);
        $this->receptionist->assignRole('receptionist');

        $this->patient = Patient::create([
            'public_id' => Str::uuid()->toString(),
            'branch_id' => $this->branch->id,
            'first_name' => 'John',
            'last_name' => 'Doe',
            'date_of_birth' => '1990-01-01',
            'gender' => 'M',
            'phone' => '+1234567890',
            'patient_number' => 'PAT-2026-000002',
        ]);

        $schedule = DoctorSchedule::create([
            'id' => Str::uuid()->toString(),
            'doctor_id' => $doctor->id,
            'branch_id' => $this->branch->id,
            'name' => 'GP',
            'slot_duration' => 30,
            'max_concurrent' => 1,
            'valid_from' => '2026-01-01',
            'is_active' => true,
        ]);

        $this->appointment = Appointment::create([
            'public_id' => Str::uuid()->toString(),
            'patient_id' => $this->patient->id,
            'doctor_id' => $doctor->id,
            'branch_id' => $this->branch->id,
            'schedule_id' => $schedule->id,
            'appointment_date' => Carbon::now()->addDays(2)->toDateString(),
            'start_time' => '10:00:00',
            'end_time' => '10:30:00',
            'status' => 'scheduled',
            'type' => 'new_patient',
            'booked_by' => $this->receptionist->id,
            'appointment_number' => 'APT-2026-0002',
        ]);
    }

    public function test_staff_can_cancel_appointment_with_reason(): void
    {
        $response = $this->actingAs($this->receptionist)->patchJson("/api/v1/appointments/{$this->appointment->public_id}/cancel", [
            'reason' => 'Patient requested',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('appointments', [
            'public_id' => $this->appointment->public_id,
            'status' => 'cancelled',
            'cancellation_reason' => 'Patient requested',
        ]);
    }

    public function test_staff_can_confirm_appointment(): void
    {
        $response = $this->actingAs($this->receptionist)->patchJson("/api/v1/appointments/{$this->appointment->public_id}/confirm");

        $response->assertStatus(200);
        $this->assertDatabaseHas('appointments', [
            'public_id' => $this->appointment->public_id,
            'status' => 'confirmed',
        ]);
    }

    public function test_staff_can_mark_no_show(): void
    {
        $response = $this->actingAs($this->receptionist)->patchJson("/api/v1/appointments/{$this->appointment->public_id}/no-show");

        $response->assertStatus(200);
        $this->assertDatabaseHas('appointments', [
            'public_id' => $this->appointment->public_id,
            'status' => 'no_show',
        ]);
    }
}
