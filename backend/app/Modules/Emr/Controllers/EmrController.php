<?php

declare(strict_types=1);

namespace App\Modules\Emr\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Emr\Models\Encounter;
use App\Modules\Emr\Repositories\Contracts\DiagnosisCatalogRepository;
use App\Modules\Emr\Repositories\Contracts\EncounterRepository;
use App\Modules\Emr\Requests\AddDiagnosisRequest;
use App\Modules\Emr\Requests\AmendSoapRequest;
use App\Modules\Emr\Requests\CompleteEncounterRequest;
use App\Modules\Emr\Requests\OpenEncounterRequest;
use App\Modules\Emr\Requests\SaveSoapRequest;
use App\Modules\Emr\Resources\DiagnosisCatalogResource;
use App\Modules\Emr\Resources\DiagnosisResource;
use App\Modules\Emr\Resources\EncounterResource;
use App\Modules\Emr\Resources\SoapNoteResource;
use App\Modules\Emr\Services\EmrService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

final class EmrController extends Controller
{
    public function __construct(
        private readonly EmrService $service,
        private readonly EncounterRepository $encounters,
        private readonly DiagnosisCatalogRepository $catalog,
    ) {}

    /** POST /api/v1/encounters — open (or reuse) the encounter for a visit. */
    public function store(OpenEncounterRequest $request): JsonResponse
    {
        $encounter = $this->service->openEncounter(
            (int) $request->integer('visit_id'),
            $request->validated(),
            $request->user(),
        );

        return (new EncounterResource($this->reload($encounter->id)))
            ->response()
            ->setStatusCode(201);
    }

    /** GET /api/v1/encounters/{id} */
    public function show(int $id): JsonResource
    {
        return new EncounterResource($this->requireEncounter($id));
    }

    /** GET /api/v1/encounters/visit/{visitId} — encounter for a visit. */
    public function byVisit(int $visitId): JsonResource
    {
        $encounter = $this->encounters->findEncounterByVisit($visitId);
        abort_if($encounter === null, 404, 'No encounter for this visit.');

        return new EncounterResource($this->reload($encounter->id));
    }

    /** GET /api/v1/patients/{patientId}/encounters — clinical history. */
    public function history(Request $request, int $patientId): AnonymousResourceCollection
    {
        $limit = (int) min(100, max(1, $request->integer('limit', 20)));

        return EncounterResource::collection(
            $this->encounters->encountersForPatient($patientId, $limit)
        );
    }

    /** POST /api/v1/encounters/{id}/complete */
    public function complete(CompleteEncounterRequest $request, int $id): JsonResource
    {
        $encounter = $this->service->completeEncounter($id, $request->input('disposition'), $request->user());

        return new EncounterResource($this->reload($encounter->id));
    }

    /** PUT /api/v1/encounters/{id}/soap — create/update the working SOAP note. */
    public function saveSoap(SaveSoapRequest $request, int $id): JsonResource
    {
        $note = $this->service->saveSoap($id, $request->validated(), $request->user());

        return new SoapNoteResource($note);
    }

    /** POST /api/v1/encounters/{id}/soap/sign */
    public function signSoap(Request $request, int $id): JsonResource
    {
        abort_unless($request->user()?->can('emr.sign'), 403);
        $note = $this->service->signSoap($id, $request->user());

        return new SoapNoteResource($note);
    }

    /** POST /api/v1/encounters/{id}/soap/amend */
    public function amendSoap(AmendSoapRequest $request, int $id): JsonResponse
    {
        $note = $this->service->amendSoap($id, $request->validated(), $request->user());

        return (new SoapNoteResource($note))->response()->setStatusCode(201);
    }

    /**
     * POST /api/v1/encounters/{id}/soap/acknowledge
     *
     * Marks the signed note as acknowledged (read) by the requesting user —
     * typically a nurse confirming they have seen the care instructions.
     * Gated by `emr.acknowledge` permission (granted to: nurse, doctor, records-officer).
     */
    public function acknowledgeSoap(Request $request, int $id): JsonResource
    {
        abort_unless($request->user()?->can('emr.acknowledge'), 403);
        $note = $this->service->acknowledgeSoap($id, $request->user());

        return new SoapNoteResource($note);
    }

    /** POST /api/v1/encounters/{id}/diagnoses */
    public function addDiagnosis(AddDiagnosisRequest $request, int $id): JsonResponse
    {
        $diagnosis = $this->service->addDiagnosis($id, $request->validated(), $request->user());

        return (new DiagnosisResource($diagnosis))->response()->setStatusCode(201);
    }

    /** DELETE /api/v1/diagnoses/{id} */
    public function removeDiagnosis(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()?->can('diagnoses.delete'), 403);
        $this->service->removeDiagnosis($id, $request->user());

        return response()->json(null, 204);
    }

    /** GET /api/v1/diagnoses-catalog?q=... — ICD-10 type-ahead. */
    public function searchCatalog(Request $request): AnonymousResourceCollection
    {
        $term = (string) $request->query('q', '');
        $limit = (int) min(50, max(1, $request->integer('limit', 20)));

        return DiagnosisCatalogResource::collection(
            $term === '' ? collect() : $this->catalog->search($term, $limit)
        );
    }

    private function requireEncounter(int $id): Encounter
    {
        $encounter = $this->reload($id);
        abort_if($encounter === null, 404, 'Encounter not found.');

        return $encounter;
    }

    private function reload(int $id): ?Encounter
    {
        /** @var Encounter|null $encounter */
        $encounter = $this->encounters->findEncounter($id);

        return $encounter;
    }
}
