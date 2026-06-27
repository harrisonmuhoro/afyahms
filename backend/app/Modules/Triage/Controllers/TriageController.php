<?php

declare(strict_types=1);

namespace App\Modules\Triage\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Triage\Models\TriageAssessment;
use App\Modules\Triage\Requests\RecordTriageRequest;
use App\Modules\Triage\Resources\TriageAssessmentResource;
use App\Modules\Triage\Services\TriageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class TriageController extends Controller
{
    public function __construct(private readonly TriageService $service) {}

    /** POST /api/v1/triage — record vitals + MTS category. */
    public function store(RecordTriageRequest $request): JsonResponse
    {
        $assessment = $this->service->recordAssessment(
            (int) $request->integer('visit_id'),
            $request->validated(),
            $request->user(),
        );

        return (new TriageAssessmentResource($assessment))
            ->response()
            ->setStatusCode(201);
    }

    /** GET /api/v1/triage/{id} */
    public function show(int $id): JsonResource
    {
        $assessment = TriageAssessment::query()->findOrFail($id);

        return new TriageAssessmentResource($assessment);
    }

    /** GET /api/v1/triage/visit/{visitId} — latest assessment for a visit. */
    public function byVisit(int $visitId): JsonResource
    {
        $assessment = app(\App\Modules\Triage\Repositories\Contracts\TriageRepository::class)
            ->findByVisit($visitId);

        abort_if($assessment === null, 404, 'No triage assessment for this visit.');

        return new TriageAssessmentResource($assessment);
    }

    /** GET /api/v1/triage/patient/{patientId}/latest */
    public function latestForPatient(Request $request, int $patientId): AnonymousResourceCollection
    {
        $limit = (int) min(20, max(1, $request->integer('limit', 5)));
        $list = app(\App\Modules\Triage\Repositories\Contracts\TriageRepository::class)
            ->latestForPatient($patientId, $limit);

        return TriageAssessmentResource::collection($list);
    }
}
