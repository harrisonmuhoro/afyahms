<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Appointments\Models\DoctorSchedule;
use App\Modules\Appointments\Requests\CreateScheduleRequest;
use App\Modules\Appointments\Requests\UpdateScheduleRequest;
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

        $schedules = DoctorSchedule::with(['doctor', 'branch', 'timeBlocks'])
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
}
