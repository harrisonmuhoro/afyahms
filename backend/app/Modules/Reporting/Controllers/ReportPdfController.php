<?php

declare(strict_types=1);

namespace App\Modules\Reporting\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReportFilterRequest;
use App\Jobs\GenerateReportPdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

final class ReportPdfController extends Controller
{
    /**
     * Dispatch an async job to generate a report PDF.
     */
    public function generate(ReportFilterRequest $request, string $type): JsonResponse
    {
        // Validate the type is a known report
        $controller = app(ReportingController::class);
        $response = $controller->getReportData($request, $type);

        if ($response->getStatusCode() === 404) {
            return response()->json(['message' => 'Invalid report type for PDF export.'], 400);
        }

        $data = $response->getData(true);

        $jobId = Str::uuid()->toString();
        $filters = $request->validated();

        Cache::put("pdf_job_{$jobId}", ['status' => 'processing'], now()->addHours(24));

        GenerateReportPdf::dispatch($jobId, $type, $filters, $data);

        return response()->json([
            'job_id'  => $jobId,
            'message' => 'PDF generation started',
        ], 202);
    }

    /**
     * Poll the status of a PDF generation job.
     */
    public function status(string $jobId): JsonResponse
    {
        $job = Cache::get("pdf_job_{$jobId}");

        if (!$job) {
            return response()->json(['message' => 'Job not found or expired.'], 404);
        }

        if ($job['status'] === 'ready') {
            return response()->json([
                'status' => 'ready',
                'url' => route('reports.pdf.download', ['jobId' => $jobId]),
            ]);
        }

        return response()->json(['status' => 'processing']);
    }

    /**
     * Download the completed PDF report securely.
     */
    public function download(string $jobId)
    {
        $job = Cache::get("pdf_job_{$jobId}");

        if (!$job || $job['status'] !== 'ready') {
            abort(404, 'Report not found or not ready.');
        }

        $disk = config('filesystems.default') === 's3' ? 's3' : 'pdf';

        if ($disk === 's3') {
            return redirect(Storage::disk('s3')->temporaryUrl($job['path'], now()->addMinutes(30)));
        }

        return Storage::disk('pdf')->download($job['path'], "report_{$jobId}.pdf");
    }
}
