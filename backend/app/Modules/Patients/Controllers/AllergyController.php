<?php

declare(strict_types=1);

namespace App\Modules\Patients\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Patients\Requests\StoreAllergyRequest;
use App\Modules\Patients\Resources\AllergyResource;
use App\Modules\Patients\Services\AllergyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;

final class AllergyController extends Controller
{
    public function __construct(private readonly AllergyService $service) {}

    public function index(string $uuid): JsonResource
    {
        return AllergyResource::collection($this->service->listForPatient($uuid));
    }

    public function store(StoreAllergyRequest $request, string $uuid): JsonResponse
    {
        $row = $this->service->create($uuid, $request->validated(), $request->user());

        return (new AllergyResource($row))->response()->setStatusCode(201);
    }

    public function destroy(string $uuid, int $allergyId): JsonResponse
    {
        $this->service->delete($uuid, $allergyId);

        return response()->json(['message' => 'Removed.']);
    }
}