<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Services\PdfService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;

class GenerateReportPdf implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public string $jobId,
        public string $reportType,
        public array $filters,
        public array $reportData // Ideally, for very large reports, you'd re-query inside the job. For now, passing data is ok.
    ) {
    }

    /**
     * Execute the job.
     */
    public function handle(PdfService $pdfService): void
    {
        // 1. Determine the view based on reportType
        $viewName = match ($this->reportType) {
            'revenue-summary'         => 'pdf.reports.revenue_summary',
            'payments-collected'      => 'pdf.reports.payments_collected',
            'outstanding-invoices'    => 'pdf.reports.outstanding_invoices',
            'lab-results'             => 'pdf.reports.lab_results',
            'patient-encounters'      => 'pdf.reports.patient_encounters',
            'patient-volume'          => 'pdf.reports.patient_volume',
            'diagnoses-summary'       => 'pdf.reports.diagnoses_summary',
            'prescriptions-issued'    => 'pdf.reports.prescriptions_issued',
            'appointment-statistics'  => 'pdf.reports.appointment_statistics',
            'wait-times'              => 'pdf.reports.wait_times',
            'queue-throughput'        => 'pdf.reports.queue_throughput',
            'stock-levels'            => 'pdf.reports.stock_levels',
            'stock-consumption'       => 'pdf.reports.stock_consumption',
            'expiring-items'          => 'pdf.reports.expiring_items',
            'sha-claims'              => 'pdf.reports.sha_claims',
            default                   => 'pdf.reports.generic',
        };

        // 2. Generate PDF and get path
        $path = $pdfService->generateReportFile($viewName, [
            'data' => $this->reportData,
            'filters' => $this->filters,
        ]);

        // 3. Mark job as complete with path
        Cache::put("pdf_job_{$this->jobId}", [
            'status' => 'ready',
            'path' => $path,
        ], now()->addHours(24));
    }
}
