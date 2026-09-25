<?php

declare(strict_types=1);

namespace Tests\Feature\Appointments;

use App\Modules\Appointments\Models\Appointment;
use App\Modules\Appointments\Models\BranchPublicHoliday;
use App\Modules\Appointments\Models\DoctorSchedule;
use App\Modules\Appointments\Models\ScheduleOverride;
use App\Modules\Appointments\Models\ScheduleTimeBlock;
use App\Modules\Appointments\Services\SlotGeneratorService;
use App\Modules\Tenancy\Models\Branch;
use App\Models\User;
use Carbon\Carbon;
use Tests\TestCase;
use Illuminate\Support\Str;

class SlotGeneratorServiceTest extends TestCase
{
    private SlotGeneratorService $service;
    private User $doctor;
    private Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate:fresh');

        $this->service = new SlotGeneratorService();

        $this->branch = Branch::create([
            'code' => 'TST', 'name' => 'Test Branch', 'is_active' => true,
        ]);
        app()->instance('active_branch_id', $this->branch->id);

        $this->doctor = User::factory()->create([
            'home_branch_id' => $this->branch->id,
            'current_branch_id' => $this->branch->id,
        ]);
    }

    public function test_it_generates_available_slots_from_time_blocks(): void
    {
        $date = Carbon::parse('2026-08-25'); // A Tuesday

        $schedule = DoctorSchedule::create([
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
            'schedule_id' => $schedule->id,
            'day_of_week' => 2, // Tuesday
            'start_time' => '08:00:00',
            'end_time' => '09:00:00',
        ]);

        $slots = $this->service->getAvailableSlots($this->doctor->id, $date, $this->branch->id, $schedule->id);

        $this->assertCount(2, $slots);
        $this->assertEquals('08:00:00', $slots[0]['start_time']);
        $this->assertEquals('08:30:00', $slots[0]['end_time']);
        $this->assertEquals('available', $slots[0]['status']);

        $this->assertEquals('08:30:00', $slots[1]['start_time']);
        $this->assertEquals('09:00:00', $slots[1]['end_time']);
        $this->assertEquals('available', $slots[1]['status']);
    }

    public function test_it_blocks_slots_if_public_holiday_exists(): void
    {
        $date = Carbon::parse('2026-08-25');

        BranchPublicHoliday::create([
            'id' => Str::uuid()->toString(),
            'branch_id' => $this->branch->id,
            'holiday_date' => $date->toDateString(),
            'name' => 'Independence Day',
            'is_active' => true,
        ]);

        $schedule = DoctorSchedule::create([
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
            'schedule_id' => $schedule->id,
            'day_of_week' => 2,
            'start_time' => '08:00:00',
            'end_time' => '09:00:00',
        ]);

        $slots = $this->service->getAvailableSlots($this->doctor->id, $date, $this->branch->id, $schedule->id);

        $this->assertEmpty($slots);
    }

    public function test_it_applies_unavailable_overrides(): void
    {
        $date = Carbon::parse('2026-08-25');

        $schedule = DoctorSchedule::create([
            'id' => Str::uuid()->toString(),
            'doctor_id' => $this->doctor->id,
            'branch_id' => $this->branch->id,
            'name' => 'GP',
            'slot_duration' => 30,
            'max_concurrent' => 1,
            'valid_from' => '2026-01-01',
            'is_active' => true,
        ]);

        ScheduleTimeBlock::create([
            'id' => Str::uuid()->toString(),
            'schedule_id' => $schedule->id,
            'day_of_week' => 2,
            'start_time' => '08:00:00',
            'end_time' => '10:00:00',
        ]);

        // Block 08:30 to 09:30
        ScheduleOverride::create([
            'id' => Str::uuid()->toString(),
            'schedule_id' => $schedule->id,
            'override_date' => $date->toDateString(),
            'type' => 'unavailable',
            'start_time' => '08:30:00',
            'end_time' => '09:30:00',
            'created_by' => $this->doctor->id,
        ]);

        $slots = $this->service->getAvailableSlots($this->doctor->id, $date, $this->branch->id, $schedule->id);

        $this->assertCount(2, $slots);
        $this->assertEquals('08:00:00', $slots[0]['start_time']); // 08:00-08:30 available
        $this->assertEquals('09:30:00', $slots[1]['start_time']); // 09:30-10:00 available
    }
}
