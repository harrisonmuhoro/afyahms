<?php

declare(strict_types=1);

namespace App\Modules\Patients\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Patients\Requests\StorePatientInsuranceRequest;
use App\Modules\Patients\Requests\UpdatePatientInsuranceRequest;
use App\Modules\Patients\Resources\PatientInsuranceResource;
use App\Modules\Patients\Services\PatientInsuranceService;
use App\Modules\Patients\Services\PatientService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;

final class PatientInsuranceController extends Controller
{
    public function __construct(private readonly PatientInsuranceService $service) {}

    public function index(string $uuid): JsonResource
    {
        $patient = app(PatientService::class)->findByPublicId($uuid);
        $this->authorize('view', $patient);

        return PatientInsuranceResource::collection($this->service->listForPatient($uuid));
    }

    public function store(StorePatientInsuranceRequest $request, string $uuid): JsonResponse
    {
        $patient = app(PatientService::class)->findByPublicId($uuid);
        $this->authorize('manage', $patient);

        $row = $this->service->create($uuid, $request->validated());

        return (new PatientInsuranceResource($row))->response()->setStatusCode(201);
    }

    public function update(UpdatePatientInsuranceRequest $request, string $uuid, int $insuranceId): JsonResource
    {
        $patient = app(PatientService::class)->findByPublicId($uuid);
        $this->authorize('manage', $patient);

        $row = $this->service->update($uuid, $insuranceId, $request->validated());

        return new PatientInsuranceResource($row);
    }

    public function destroy(string $uuid, int $insuranceId): JsonResponse
    {
        $patient = app(PatientService::class)->findByPublicId($uuid);
        $this->authorize('manage', $patient);

        $this->service->delete($uuid, $insuranceId);

        return response()->json(['message' => 'Removed.']);
    }
}