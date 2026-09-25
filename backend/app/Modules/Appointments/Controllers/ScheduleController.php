<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Appointments\Models\DoctorSchedule;
use App\Modules\Appointments\Models\Appointment;
use App\Modules\Appointments\Requests\CreateScheduleRequest;
use App\Modules\Appointments\Requests\UpdateScheduleRequest;
use App\Modules\Appointments\Requests\CreateScheduleOverrideRequest;
use App\Modules\Appointments\Resources\DoctorScheduleResource;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class ScheduleController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', DoctorSchedule::class);

        $schedules = DoctorSchedule::with(['doctor', 'branch', 'timeBlocks', 'overrides'])
            ->when($request->doctor_id, fn ($q, $id) => $q->where('doctor_id', $id))
            ->when($request->branch_id, fn ($q, $id) => $q->where('branch_id', $id))
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return DoctorScheduleResource::collection($schedules);
    }

    public function store(CreateScheduleRequest $request): JsonResponse
    {
        $this->authorize('create', DoctorSchedule::class);
        $data = $request->validated();

        if ($request->user()->hasRole('doctor') && !$request->user()->hasRole('superadmin') && !$request->user()->hasRole('hospital-admin')) {
            $data['doctor_id'] = $request->user()->id;
        }

        abort_unless(
            $request->user()->hasRole('superadmin')
                || $request->user()->can('branch.view-all')
                || in_array((int) $data['branch_id'], array_map('intval', $request->user()->accessibleBranchIds()), true),
            403,
            'You cannot create a schedule outside your assigned branch.'
        );

        $schedule = DB::transaction(function () use ($data) {
            $schedule = DoctorSchedule::create([
                'branch_id' => $data['branch_id'],
                'doctor_id' => $data['doctor_id'],
                'name' => $data['name'],
                'slot_duration' => $data['slot_duration'],
                'max_concurrent' => $data['max_concurrent'],
                'valid_from' => $data['valid_from'],
                'valid_until' => $data['valid_until'] ?? null,
            ]);

            foreach ($data['time_blocks'] as $block) {
                $schedule->timeBlocks()->create($block);
            }

            return $schedule;
        });

        return response()->json([
            'message' => 'Schedule created successfully.',
            'schedule' => new DoctorScheduleResource($schedule->load(['doctor', 'branch', 'timeBlocks'])),
        ], 201);
    }

    public function show(DoctorSchedule $schedule): DoctorScheduleResource
    {
        $this->authorize('view', $schedule);
        return new DoctorScheduleResource($schedule->load(['doctor', 'branch', 'timeBlocks', 'overrides']));
    }

    public function update(UpdateScheduleRequest $request, DoctorSchedule $schedule): JsonResponse
    {
        $this->authorize('update', $schedule);
        $data = $request->validated();

        DB::transaction(function () use ($schedule, $data) {
            $schedule->update(array_intersect_key($data, array_flip([
                'name', 'slot_duration', 'max_concurrent', 'valid_from', 'valid_until', 'is_active'
            ])));

            if (isset($data['time_blocks'])) {
                $schedule->timeBlocks()->delete();
                foreach ($data['time_blocks'] as $block) {
                    $schedule->timeBlocks()->create($block);
                }
            }
        });

        return response()->json([
            'message' => 'Schedule updated successfully.',
            'schedule' => new DoctorScheduleResource($schedule->fresh(['doctor', 'branch', 'timeBlocks'])),
        ]);
    }

    public function destroy(DoctorSchedule $schedule): JsonResponse
    {
        $this->authorize('delete', $schedule);
        $schedule->update(['is_active' => false]);

        return response()->json(['message' => 'Schedule deactivated.']);
    }

    public function addOverride(CreateScheduleOverrideRequest $request, DoctorSchedule $schedule): JsonResponse
    {
        $this->authorize('update', $schedule);

        $override = $schedule->overrides()->updateOrCreate(
            ['override_date' => $request->date('override_date')],
            [
                'type' => $request->string('type')->toString(),
                'start_time' => $request->input('start_time'),
                'end_time' => $request->input('end_time'),
                'reason' => $request->input('reason'),
                'created_by' => $request->user()->id,
            ],
        );

        $conflicts = [];
        if ($override->type === 'unavailable') {
            $appointments = Appointment::withoutGlobalScopes()
                ->where('branch_id', $schedule->branch_id)
                ->where('doctor_id', $schedule->doctor_id)
                ->whereDate('appointment_date', $override->override_date)
                ->whereNotIn('status', ['cancelled', 'rescheduled', 'no_show'])
                ->when($override->start_time, function ($query) use ($override) {
                    $query->where('start_time', '<', $override->end_time)
                        ->where('end_time', '>', $override->start_time);
                })
                ->get();

            $reason = 'Schedule unavailable: '.($override->reason ?: 'provider leave or closure');
            foreach ($appointments as $appointment) {
                $appointment->update([
                    'schedule_conflict' => true,
                    'schedule_conflict_reason' => $reason,
                    'schedule_conflict_at' => now(),
                ]);
                $conflicts[] = [
                    'id' => $appointment->id,
                    'appointment_number' => $appointment->appointment_number,
                    'date' => $appointment->appointment_date?->format('Y-m-d'),
                    'start_time' => $appointment->start_time,
                    'end_time' => $appointment->end_time,
                ];
            }
        }

        return response()->json([
            'message' => 'Schedule override saved.',
            'override' => $override,
            'conflicts' => $conflicts,
            'manual_review_required' => $conflicts !== [],
        ], 201);
    }

    public function removeOverride(DoctorSchedule $schedule, string $date): JsonResponse
    {
        $this->authorize('update', $schedule);
        $schedule->overrides()->whereDate('override_date', $date)->delete();

        return response()->json(['message' => 'Schedule override removed.']);
    }
}
