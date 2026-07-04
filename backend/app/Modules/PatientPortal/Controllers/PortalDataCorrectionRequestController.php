<?php

declare(strict_types=1);

namespace App\Modules\PatientPortal\Controllers;

use App\Exceptions\Domain\ForbiddenException;
use App\Http\Controllers\Controller;
use App\Modules\Patients\Models\DataCorrectionRequest;
use App\Modules\Patients\Requests\StoreDataCorrectionRequest;
use App\Modules\Patients\Resources\DataCorrectionRequestResource;
use App\Modules\Patients\Services\DataCorrectionRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class PortalDataCorrectionRequestController extends Controller
{
    public function __construct(private readonly DataCorrectionRequestService $service) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $patient = $request->user()?->patient;
        if ($patient === null) {
            throw new ForbiddenException('No patient record is linked to this account.');
        }

        return DataCorrectionRequestResource::collection(
            DataCorrectionRequest::query()
                ->with(['patient', 'reviewer'])
                ->where('patient_id', $patient->id)
                ->latest()
                ->paginate(min(100, max(1, (int) $request->integer('per_page', 25)))),
        );
    }

    public function store(StoreDataCorrectionRequest $request): JsonResponse
    {
        $patient = $request->user()?->patient;
        if ($patient === null) {
            throw new ForbiddenException('No patient record is linked to this account.');
        }

        $row = $this->service->createForPatient(
            patient: $patient,
            actor: $request->user(),
            attributes: $request->validated(),
            request: $request,
        );

        return (new DataCorrectionRequestResource($row))
            ->response()
            ->setStatusCode(201);
    }
}
