<?php

declare(strict_types=1);

namespace App\Modules\Appointments\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Appointments\Models\BranchPublicHoliday;
use App\Modules\Appointments\Requests\CreateBranchHolidayRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class HolidayController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('appointments.read'), 403);

        $holidays = BranchPublicHoliday::query()
            ->when($request->branch_id, fn ($q, $branchId) => $q->where('branch_id', $branchId))
            ->when($request->from, fn ($q, $from) => $q->whereDate('holiday_date', '>=', $from))
            ->when($request->to, fn ($q, $to) => $q->whereDate('holiday_date', '<=', $to))
            ->orderBy('holiday_date')
            ->get();

        return response()->json(['data' => $holidays]);
    }

    public function store(CreateBranchHolidayRequest $request): JsonResponse
    {
        $this->assertBranchAccess($request, (int) $request->branch_id, true);

        $holiday = BranchPublicHoliday::query()->updateOrCreate(
            ['branch_id' => $request->integer('branch_id'), 'holiday_date' => $request->date('holiday_date')],
            [
                'name' => $request->string('name')->toString(),
                'is_active' => $request->boolean('is_active', true),
                'created_by' => $request->user()->id,
            ],
        );

        return response()->json(['message' => 'Public holiday saved.', 'holiday' => $holiday], 201);
    }

    public function destroy(Request $request, BranchPublicHoliday $holiday): JsonResponse
    {
        $this->assertBranchAccess($request, (int) $holiday->branch_id, true);
        $holiday->update(['is_active' => false]);

        return response()->json(['message' => 'Public holiday removed.']);
    }

    private function assertBranchAccess(Request $request, int $branchId, bool $write): void
    {
        $user = $request->user();
        $allowed = $user !== null && ($user->hasRole('superadmin') || $user->can('branch.view-all')
            || in_array($branchId, array_map('intval', $user->accessibleBranchIds()), true));

        abort_unless($allowed && (!$write || $user->can('appointments.update')), 403);
    }
}
