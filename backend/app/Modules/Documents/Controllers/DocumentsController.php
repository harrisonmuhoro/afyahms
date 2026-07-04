<?php

declare(strict_types=1);

namespace App\Modules\Documents\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Documents\Models\Document;
use App\Modules\Documents\Services\DocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Read-only controller for clinical documents. Uploads happen via service
 * calls from other modules (e.g. Radiology uploading an image).
 */
final class DocumentsController extends Controller
{
    public function __construct(private readonly DocumentService $documents) {}

    public function show(Document $document): JsonResponse
    {
        $this->authorize('view', $document);

        return response()->json([
            'document' => [
                'id'           => $document->public_id,
                'filename'     => $document->original_filename,
                'mime_type'    => $document->mime_type,
                'size_bytes'   => $document->size_bytes,
                'category'     => $document->category,
                'uploaded_at'  => $document->created_at?->toIso8601String(),
                'download_url' => $this->documents->temporaryUrl($document),
            ],
        ]);
    }

    public function destroy(Document $document): JsonResponse
    {
        $this->authorize('delete', $document);

        $this->documents->archive($document);

        return response()->json(['message' => 'Document archived. Clinical file retained per retention policy.']);
    }
}
