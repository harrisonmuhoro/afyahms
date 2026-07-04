<?php

declare(strict_types=1);

namespace App\Modules\Patients\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Patients\Models\DataCorrectionRequest;
use App\Modules\Patients\Models\Patient;
use App\Modules\Patients\Requests\ReviewDataCorrectionRequest;
use App\Modules\Patients\Requests\StoreDataCorrectionRequest;
use App\Modules\Patients\Resources\DataCorrectionRequestResource;
use App\Modules\Patients\Services\DataCorrectionRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

final class DataCorrectionRequestController extends Controller
{
    public function __construct(private readonly DataCorrectionRequestService $service) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = DataCorrectionRequest::query()
            ->with(['patient', 'requester', 'reviewer'])
            ->when(
                $request->filled('status'),
                fn ($q) => $q->where('status', $request->string('status')->toString()),
            )
            ->when(
                $request->filled('patient_id'),
                fn ($q) => $q->whereHas(
                    'patient',
                    fn ($patientQuery) => $patientQuery->where('public_id', $request->string('patient_id')->toString()),
                ),
            )
            ->latest();

        return DataCorrectionRequestResource::collection(
            $query->paginate(min(100, max(1, (int) $request->integer('per_page', 25)))),
        );
    }

    public function store(StoreDataCorrectionRequest $request, string $uuid): JsonResponse
    {
        $patient = Patient::query()->where('public_id', $uuid)->firstOrFail();

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

    public function review(ReviewDataCorrectionRequest $request, DataCorrectionRequest $correctionRequest): JsonResource
    {
        $row = $this->service->review(
            row: $correctionRequest,
            reviewer: $request->user(),
            status: $request->string('status')->toString(),
            reason: $request->string('reason')->toString(),
            request: $request,
        );

        return new DataCorrectionRequestResource($row);
    }
}
