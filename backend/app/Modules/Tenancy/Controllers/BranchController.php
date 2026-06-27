<?php

declare(strict_types=1);

namespace App\Modules\Tenancy\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Tenancy\Requests\CreateBranchRequest;
use App\Modules\Tenancy\Requests\UpdateBranchRequest;
use App\Modules\Tenancy\Resources\BranchResource;
use App\Modules\Tenancy\Services\BranchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class BranchController extends Controller
{
    public function __construct(private readonly BranchService $branches) {}

    public function index(Request $request): JsonResource
    {
        $user = $request->user();
        $branches = $this->branches->listForUser($user);

        return BranchResource::collection($branches);
    }

    public function show(int $id): JsonResource
    {
        $branch = $this->branches
            ->listForUser(request()->user())
            ->firstWhere('id', $id)
            ?? $this->branches->listForUser(request()->user())->firstWhere('public_id', $id);

        abort_unless($branch, 404, 'Branch not found or not accessible.');

        return new BranchResource($branch);
    }

    public function store(CreateBranchRequest $request): JsonResponse
    {
        $branch = $this->branches->create($request->validated());

        return (new BranchResource($branch))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateBranchRequest $request, int $id): JsonResource
    {
        $branch = app(\App\Modules\Tenancy\Repositories\Contracts\BranchRepository::class)->find($id);
        abort_unless($branch, 404);
        $branch = $this->branches->update($branch, $request->validated());

        return new BranchResource($branch);
    }
}