<?php

declare(strict_types=1);

namespace App\Modules\Queue\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Queue\Models\QueueStation;
use App\Modules\Queue\Resources\QueueStationResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Staff station check-in/check-out.
 * Updates user.current_station_id when staff arrive at or leave a station.
 *
 * POST /api/v1/queue/stations/{id}/check-in  — sets current_station_id
 * POST /api/v1/queue/stations/{id}/check-out — clears current_station_id
 */
final class StationCheckInController extends Controller
{
    /** POST /api/v1/queue/stations/{id}/check-in */
    public function checkIn(Request $request, int $stationId): JsonResponse
    {
        $user = $request->user();
        $station = QueueStation::query()->findOrFail($stationId);

        // Only allow check-in to stations in the user's active branch.
        if ((int) $station->branch_id !== $this->resolveBranchId($request)) {
            abort(403, 'Station belongs to a different branch.');
        }

        $user->update(['current_station_id' => $station->id]);

        return response()->json([
            'message'         => "Checked in to station {$station->code}.",
            'current_station' => new QueueStationResource($station),
        ]);
    }

    /** POST /api/v1/queue/stations/{id}/check-out */
    public function checkOut(Request $request, int $stationId): JsonResponse
    {
        $user = $request->user();

        // No-op if already checked out.
        $user->update(['current_station_id' => null]);

        return response()->json([
            'message'         => 'Checked out from station.',
            'current_station' => null,
        ]);
    }

    private function resolveBranchId(Request $request): int
    {
        $active = app(\App\Modules\Tenancy\Services\BranchContext::class)->get();
        if ($active !== null) {
            return $active;
        }
        $user = $request->user();
        if ($user !== null && $user->home_branch_id !== null) {
            return (int) $user->home_branch_id;
        }

        abort(403, 'No active branch resolved for this request.');
    }
}
