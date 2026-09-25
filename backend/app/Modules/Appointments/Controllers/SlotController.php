<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Appointments\Services\SlotGeneratorService;
use App\Modules\Appointments\Resources\SlotResource;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SlotController extends Controller
{
    public function __construct(
        private readonly SlotGeneratorService $slotService
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'doctor_id' => ['required', 'exists:users,id'],
            'branch_id' => ['required', 'exists:branches,id'],
            'date' => ['required', 'date', 'after_or_equal:today'],
        ]);

        $slots = $this->slotService->getAvailableSlots(
            (int) $request->doctor_id,
            Carbon::parse($request->date),
            (int) $request->branch_id
        );

        return SlotResource::collection($slots);
    }

    public function calendar(Request $request): JsonResponse
    {
        $request->validate([
            'doctor_id' => ['required', 'exists:users,id'],
            'branch_id' => ['required', 'exists:branches,id'],
            'from' => ['required', 'date', 'after_or_equal:today'],
            'to' => ['required', 'date', 'after_or_equal:from'],
        ]);

        $from = Carbon::parse($request->string('from')->toString());
        $to = Carbon::parse($request->string('to')->toString());
        abort_if($from->diffInDays($to) > 31, 422, 'Calendar range cannot exceed 31 days.');

        $days = [];
        foreach (CarbonPeriod::create($from, $to) as $date) {
            $slots = $this->slotService->getAvailableSlots(
                (int) $request->doctor_id,
                $date,
                (int) $request->branch_id,
            );

            $days[] = [
                'date' => $date->toDateString(),
                'status' => $slots === [] ? 'unavailable' : 'available',
                'available' => count(array_filter($slots, fn (array $slot) => $slot['status'] === 'available')),
                'full' => count(array_filter($slots, fn (array $slot) => $slot['status'] === 'full')),
                'slots' => $slots,
            ];
        }

        return response()->json(['data' => $days]);
    }
}
