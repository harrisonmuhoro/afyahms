<?php

declare(strict_types=1);

namespace App\Modules\Patients\Controllers;

use App\Exceptions\Domain\NotFoundException;
use App\Http\Controllers\Controller;
use App\Modules\Patients\Models\Patient;
use App\Modules\Patients\Requests\MergePatientRequest;
use App\Modules\Patients\Requests\StorePatientRequest;
use App\Modules\Patients\Requests\UpdatePatientRequest;
use App\Modules\Patients\Resources\PatientResource;
use App\Modules\Patients\Services\PatientService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Auth;

final class PatientController extends Controller
{
    public function __construct(private readonly PatientService $service) {}

    public function index(Request $request): JsonResource
    {
        $filters = $request->only(['gender', 'blood_group', 'is_active', 'created_between', 'search', 'sort']);
        $perPage = (int) min(100, max(1, (int) $request->integer('per_page', 25)));

        $paginator = $this->service->paginate($filters, $perPage);

        return PatientResource::collection($paginator)->additional([
            'meta' => [
                'pagination' => [
                    'mode'         => 'page',
                    'current_page' => $paginator->currentPage(),
                    'per_page'     => $paginator->perPage(),
                    'total'        => $paginator->total(),
                    'last_page'    => $paginator->lastPage(),
                    'from'         => $paginator->firstItem(),
                    'to'           => $paginator->lastItem(),
                ],
            ],
        ]);
    }

    public function store(StorePatientRequest $request): JsonResponse
    {
        $patient = $this->service->register($request->validated(), $request->user());

        return (new PatientResource($patient))
            ->response()
            ->setStatusCode(201)
            ->header('Location', "/api/v1/patients/{$patient->public_id}");
    }

    public function show(string $uuid): JsonResource
    {
        $patient = $this->service->findByPublicId($uuid);
        $this->authorize('manage', $patient);

        return new PatientResource($patient);
    }

    public function update(UpdatePatientRequest $request, string $uuid): JsonResource
    {
        $patient = $this->service->findByPublicId($uuid);
        $this->authorize('manage', $patient);
        $updated = $this->service->update($patient, $request->validated(), $request->user(), $request);

        return new PatientResource($updated);
    }

    public function destroy(string $uuid): JsonResponse
    {
        $patient = $this->service->findByPublicId($uuid);
        $this->authorize('manage', $patient);
        $this->service->softDelete($patient);

        return response()->json([
            'message' => 'Patient soft-deleted. Clinical data retained per retention policy.',
        ]);
    }

    public function merge(MergePatientRequest $request): JsonResource
    {
        $source = $this->service->findByPublicId($request->string('source_uuid')->toString());
        $target = $this->service->findByPublicId($request->string('target_uuid')->toString());
        $this->authorize('manage', $source);
        $this->authorize('manage', $target);

        $this->service->merge(
            $source,
            $target,
            $request->string('reason')->toString(),
            $request->user(),
        );

        return new PatientResource($target->fresh());
    }
}
