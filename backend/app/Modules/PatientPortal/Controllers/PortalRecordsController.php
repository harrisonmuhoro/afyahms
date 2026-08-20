<?php

declare(strict_types=1);

namespace App\Modules\PatientPortal\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Prescription;
use App\Modules\Emr\Models\Encounter;
use App\Modules\Tenancy\Scopes\BranchScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PortalRecordsController extends Controller
{
    /**
     * Return the patient's prescriptions.
     */
    public function prescriptions(Request $request): JsonResponse
    {
        $patientId = Auth::user()->patient_id;

        $prescriptions = Prescription::where('patient_id', $patientId)
            ->with([
                'doctor:id,first_name,last_name',
                'items',
            ])
            ->latest()
            ->paginate($request->integer('per_page', 20));

        return response()->json($prescriptions);
    }

    /**
     * Return the patient's clinical encounter history (visit records / documents).
     */
    public function documents(Request $request): JsonResponse
    {
        $patientId = Auth::user()->patient_id;

        $encounters = Encounter::withoutGlobalScope(BranchScope::class)
            ->where('patient_id', $patientId)
            ->with([
                'provider:id,first_name,last_name',
                'soapNote:id,encounter_id,subjective,objective,assessment,plan',
                'diagnoses:id,encounter_id,icd_code,description,type',
            ])
            ->whereIn('status', ['completed', 'in_progress'])
            ->latest('visit_date')
            ->paginate($request->integer('per_page', 20));

        return response()->json($encounters);
    }
}
