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

        // Enforce role-based access to stations
        if (!$user->hasRole(['superadmin', 'hospital-admin'])) {
            $allowedRoles = match ($station->code) {
                'REC' => ['receptionist'],
                'TRI' => ['nurse', 'doctor'],
                'DOC' => ['doctor'],
                'LAB' => ['lab-technician'],
                'RAD' => ['radiologist'],
                'PHA' => ['pharmacist'],
                'BIL' => ['cashier'],
                default => [], // Deny by default for unknown stations
            };

            if (!$user->hasAnyRole($allowedRoles)) {
                abort(403, "You do not have the required role to check into the {$station->code} station.");
            }
        }

        $user->update(['current_station_id' => $station->id]);

        return response()->json([
            'message'         => "Checked in to station {$station->code}.",
            'current_station' => new QueueStationResource($station),
        ]);
    }

    public function checkOut(Request $request, int $stationId): JsonResponse
    {
        $user = $request->user();

        if ($user->current_station_id === $stationId) {
            $user->update(['current_station_id' => null]);
            $message = 'Checked out from station.';
        } else {
            $message = 'You are not checked into this station.';
        }

        return response()->json([
            'message'         => $message,
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
