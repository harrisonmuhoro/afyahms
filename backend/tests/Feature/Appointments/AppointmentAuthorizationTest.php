<?php

declare(strict_types=1);

namespace Tests\Feature\Appointments;

use App\Modules\Appointments\Models\Appointment;
use App\Modules\Tenancy\Models\Branch;
use App\Models\User;
use App\Modules\Patients\Models\Patient;
use Carbon\Carbon;
use Tests\TestCase;
use Illuminate\Support\Str;

class AppointmentAuthorizationTest extends TestCase
{
    private User $doctorA;
    private User $doctorB;
    private User $billingStaff;
    private Branch $branch;
    private Appointment $appointmentA;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate:fresh');

        $this->branch = Branch::create([
            'code' => 'TST', 'name' => 'Test Branch', 'is_active' => true,
        ]);
        app()->instance('active_branch_id', $this->branch->id);
        
        $this->doctorA = User::factory()->create([
            'home_branch_id' => $this->branch->id,
            'current_branch_id' => $this->branch->id,
        ]);
        $this->doctorA->assignRole('doctor');

        $this->doctorB = User::factory()->create([
            'home_branch_id' => $this->branch->id,
            'current_branch_id' => $this->branch->id,
        ]);
        $this->doctorB->assignRole('doctor');

        $this->billingStaff = User::factory()->create([
            'home_branch_id' => $this->branch->id,
            'current_branch_id' => $this->branch->id,
        ]);
        $this->billingStaff->assignRole('billing');

        $patient = Patient::create([
            'public_id' => Str::uuid()->toString(),
            'branch_id' => $this->branch->id,
            'first_name' => 'John',
            'last_name' => 'Doe',
            'date_of_birth' => '1990-01-01',
            'gender' => 'M',
            'phone' => '+1234567890',
            'patient_number' => 'PAT-2026-000004',
        ]);

        $this->appointmentA = Appointment::create([
            'public_id' => Str::uuid()->toString(),
            'patient_id' => $patient->id,
            'doctor_id' => $this->doctorA->id,
            'branch_id' => $this->branch->id,
            'appointment_date' => Carbon::now()->toDateString(),
            'start_time' => '10:00:00',
            'end_time' => '10:30:00',
            'status' => 'confirmed',
            'type' => 'new_patient',
            'booked_by' => $this->doctorA->id,
            'appointment_number' => 'APT-2026-0004',
        ]);
    }

    public function test_doctor_can_view_own_appointment(): void
    {
        $response = $this->actingAs($this->doctorA)->getJson("/api/v1/appointments/{$this->appointmentA->public_id}");
        $response->assertStatus(200);
    }

    public function test_doctor_cannot_view_other_doctors_appointment(): void
    {
        $response = $this->actingAs($this->doctorB)->getJson("/api/v1/appointments/{$this->appointmentA->public_id}");
        $response->assertStatus(403);
    }

    public function test_billing_staff_can_view_but_cannot_modify(): void
    {
        // Read is allowed
        $response = $this->actingAs($this->billingStaff)->getJson("/api/v1/appointments/{$this->appointmentA->public_id}");
        $response->assertStatus(200);

        // Modify is denied
        $response = $this->actingAs($this->billingStaff)->patchJson("/api/v1/appointments/{$this->appointmentA->public_id}/cancel");
        $response->assertStatus(403);
    }
}
