<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Appointments\Services\SlotGeneratorService;
use App\Modules\Appointments\Resources\SlotResource;
use Carbon\Carbon;
use Illuminate\Http\Request;
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
}
