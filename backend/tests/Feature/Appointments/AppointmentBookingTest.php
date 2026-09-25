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

class AppointmentBookingTest extends TestCase
{
    private User $doctor;
    private User $receptionist;
    private Patient $patient;
    private Branch $branch;
    private DoctorSchedule $schedule;

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
            'patient_number' => 'PAT-2026-000001',
        ]);

        $this->schedule = DoctorSchedule::create([
            'id' => Str::uuid()->toString(),
            'doctor_id' => $this->doctor->id,
            'branch_id' => $this->branch->id,
            'name' => 'General Practice',
            'slot_duration' => 30,
            'max_concurrent' => 1,
            'valid_from' => '2026-01-01',
            'is_active' => true,
        ]);

        ScheduleTimeBlock::create([
            'id' => Str::uuid()->toString(),
            'schedule_id' => $this->schedule->id,
            'day_of_week' => 2, // Tuesday
            'start_time' => '08:00:00',
            'end_time' => '10:00:00',
        ]);
    }

    public function test_staff_can_book_an_appointment(): void
    {
        $date = Carbon::parse('2026-08-25'); // Tuesday

        $response = $this->actingAs($this->receptionist)->postJson('/api/v1/appointments', [
            'branch_id' => $this->branch->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'schedule_id' => $this->schedule->id,
            'type' => 'new_patient',
            'appointment_date' => $date->toDateString(),
            'start_time' => '08:00',
            'end_time' => '08:30',
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('data.status', 'scheduled');

        $this->assertDatabaseHas('appointments', [
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'start_time' => '08:00:00',
            'end_time' => '08:30:00',
        ]);
    }

    public function test_booking_conflict_prevents_double_booking(): void
    {
        $date = Carbon::parse('2026-08-25');

        // Book first appointment
        Appointment::create([
            'public_id' => Str::uuid()->toString(),
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'branch_id' => $this->branch->id,
            'schedule_id' => $this->schedule->id,
            'appointment_date' => $date->toDateString(),
            'start_time' => '08:00:00',
            'end_time' => '08:30:00',
            'status' => 'confirmed',
            'type' => 'new_patient',
            'booked_by' => $this->receptionist->id,
            'appointment_number' => 'APT-2026-0001',
        ]);

        // Try to book the same slot
        $response = $this->actingAs($this->receptionist)->postJson('/api/v1/appointments', [
            'branch_id' => $this->branch->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'schedule_id' => $this->schedule->id,
            'type' => 'follow_up',
            'appointment_date' => $date->toDateString(),
            'start_time' => '08:00',
            'end_time' => '08:30',
        ]);

        // Should fail due to conflict
        $response->assertStatus(409); 
    }
}
