<?php

declare(strict_types=1);

namespace App\Modules\Emr\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Emr\Models\EmarRecord;
use App\Modules\Queue\Models\Visit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class EmrMedicationController extends Controller
{
    /**
     * Get eMAR records for a visit.
     */
    public function index(Request $request, Visit $visit): JsonResponse
    {
        // Require EMR read permission
        $this->authorize('viewAny', EmarRecord::class);

        $records = EmarRecord::with(['medication', 'administeredBy', 'prescription'])
            ->where('visit_id', $visit->id)
            ->orderBy('scheduled_time', 'asc')
            ->get();

        return response()->json([
            'data' => $records
        ]);
    }

    /**
     * Get pending eMAR records for the branch today.
     */
    public function pending(Request $request): JsonResponse
    {
        $this->authorize('viewAny', EmarRecord::class);
        
        $activeBranchId = app(\App\Modules\Tenancy\Services\BranchContext::class)->get() ?? $request->user()->home_branch_id;

        $records = EmarRecord::with(['medication', 'patient', 'visit'])
            ->whereHas('visit', function ($query) use ($activeBranchId) {
                $query->where('branch_id', $activeBranchId)
                      ->whereDate('created_at', today());
            })
            ->where('status', 'pending')
            ->orderBy('scheduled_time', 'asc')
            ->get();

        return response()->json([
            'data' => $records
        ]);
    }

    /**
     * Schedule a new medication administration.
     */
    public function store(Request $request, Visit $visit): JsonResponse
    {
        // Require EMR write permission
        $this->authorize('create', EmarRecord::class);

        $validated = $request->validate([
            'medication_id' => 'required|exists:medications,id',
            'prescription_id' => 'nullable|exists:prescriptions,id',
            'dose' => 'required|string|max:255',
            'route' => 'required|string|max:255',
            'frequency' => 'nullable|string|max:255',
            'scheduled_time' => 'required|date',
            'notes' => 'nullable|string'
        ]);

        $record = EmarRecord::create([
            'visit_id' => $visit->id,
            'patient_id' => $visit->patient_id,
            'medication_id' => $validated['medication_id'],
            'prescription_id' => $validated['prescription_id'] ?? null,
            'dose' => $validated['dose'],
            'route' => $validated['route'],
            'frequency' => $validated['frequency'] ?? null,
            'scheduled_time' => $validated['scheduled_time'],
            'status' => 'pending',
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'data' => $record->load('medication')
        ], 201);
    }

    /**
     * Update eMAR record status (e.g. administer, omit, refuse).
     */
    public function update(Request $request, Visit $visit, EmarRecord $emarRecord): JsonResponse
    {
        // Require EMR write permission
        $this->authorize('update', $emarRecord);

        if ($emarRecord->visit_id !== $visit->id) {
            abort(404, 'Record not found for this visit.');
        }

        $validated = $request->validate([
            'status' => 'required|in:given,refused,omitted',
            'notes' => 'nullable|string',
        ]);

        $emarRecord->update([
            'status' => $validated['status'],
            'administered_time' => now(),
            'administered_by' => $request->user()->id,
            'notes' => $validated['notes'] ?? $emarRecord->notes,
        ]);

        return response()->json([
            'data' => $emarRecord->load(['medication', 'administeredBy'])
        ]);
    }
}
