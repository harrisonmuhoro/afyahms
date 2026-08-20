<?php

declare(strict_types=1);

namespace App\Modules\PatientPortal\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Laboratory\Models\LabOrder;
use App\Modules\Radiology\Models\ImagingOrder;
use App\Modules\Tenancy\Scopes\BranchScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PortalResultsController extends Controller
{
    /**
     * List all lab and imaging results for the authenticated patient.
     * Merges both into a unified response with a `source` discriminator.
     */
    public function index(Request $request): JsonResponse
    {
        $patientId = Auth::user()->patient_id;

        // Lab results
        $labOrders = LabOrder::withoutGlobalScope(BranchScope::class)
            ->where('patient_id', $patientId)
            ->with([
                'test:id,name,category',
                'result:id,lab_order_id,result_data,interpretation,reported_at',
                'orderedBy:id,first_name,last_name',
            ])
            ->whereIn('status', ['resulted', 'processing', 'collected'])
            ->latest()
            ->get()
            ->map(fn ($o) => [
                'id'                  => $o->public_id,
                'source'              => 'lab',
                'name'                => $o->test?->name ?? 'Lab Test',
                'category'            => $o->test?->category ?? null,
                'status'              => $o->status,
                'ordered_by'          => $o->orderedBy
                    ? trim($o->orderedBy->first_name . ' ' . $o->orderedBy->last_name)
                    : null,
                'priority'            => $o->priority,
                'specimen_type'       => $o->specimen_type,
                'resulted_at'         => $o->resulted_at?->toDateTimeString(),
                'created_at'          => $o->created_at?->toDateTimeString(),
                'result'              => $o->result,
            ]);

        // Imaging results
        $imagingOrders = ImagingOrder::withoutGlobalScope(BranchScope::class)
            ->where('patient_id', $patientId)
            ->with([
                'study:id,name,modality',
                'report:id,imaging_order_id,findings,impression,reported_at,reported_by',
                'orderedBy:id,first_name,last_name',
            ])
            ->whereIn('status', ['reported', 'acquired', 'scheduled'])
            ->latest()
            ->get()
            ->map(fn ($o) => [
                'id'          => $o->public_id,
                'source'      => 'radiology',
                'name'        => $o->study?->name ?? 'Imaging Study',
                'category'    => $o->study?->modality ?? null,
                'status'      => $o->status,
                'ordered_by'  => $o->orderedBy
                    ? trim($o->orderedBy->first_name . ' ' . $o->orderedBy->last_name)
                    : null,
                'priority'    => $o->priority,
                'reported_at' => $o->reported_at?->toDateTimeString(),
                'created_at'  => $o->created_at?->toDateTimeString(),
                'result'      => $o->report,
            ]);

        $combined = $labOrders->concat($imagingOrders)
            ->sortByDesc('created_at')
            ->values();

        return response()->json(['data' => $combined]);
    }
}
