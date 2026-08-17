<?php

declare(strict_types=1);

namespace App\Modules\Patients\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Patients\Requests\StoreNextOfKinRequest;
use App\Modules\Patients\Requests\UpdateNextOfKinRequest;
use App\Modules\Patients\Resources\NextOfKinResource;
use App\Modules\Patients\Services\NextOfKinService;
use App\Modules\Patients\Services\PatientService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;

final class NextOfKinController extends Controller
{
    public function __construct(private readonly NextOfKinService $service) {}

    public function index(string $uuid): JsonResource
    {
        $patient = app(PatientService::class)->findByPublicId($uuid);
        $this->authorize('view', $patient);

        return NextOfKinResource::collection($this->service->listForPatient($uuid));
    }

    public function store(StoreNextOfKinRequest $request, string $uuid): JsonResponse
    {
        $patient = app(PatientService::class)->findByPublicId($uuid);
        $this->authorize('manage', $patient);

        $nok = $this->service->create($uuid, $request->validated());

        return (new NextOfKinResource($nok))->response()->setStatusCode(201);
    }

    public function update(UpdateNextOfKinRequest $request, string $uuid, int $nokId): JsonResource
    {
        $patient = app(PatientService::class)->findByPublicId($uuid);
        $this->authorize('manage', $patient);

        $nok = $this->service->update($uuid, $nokId, $request->validated());

        return new NextOfKinResource($nok);
    }

    public function destroy(string $uuid, int $nokId): JsonResponse
    {
        $patient = app(PatientService::class)->findByPublicId($uuid);
        $this->authorize('manage', $patient);

        $this->service->delete($uuid, $nokId);

        return response()->json(['message' => 'Removed.']);
    }
}