<?php

declare(strict_types=1);

namespace App\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Modules\Billing\Models\Bill;

class PdfService
{
    /**
     * Generate an inline PDF response for a bill receipt.
     */
    public function streamReceipt(Bill $bill): \Symfony\Component\HttpFoundation\Response
    {
        $bill->loadMissing(['visit.patient', 'items', 'patient']);

        $pdf = Pdf::loadView('pdf.receipt', [
            'bill' => $bill,
            'hospital' => config('hospital.hospital'),
        ]);

        $pdf->setPaper('A4', 'portrait');

        return $pdf->stream("receipt_{$bill->public_id}.pdf");
    }

    /**
     * Get the raw PDF content for a bill receipt (useful for email attachments).
     */
    public function getReceiptContent(Bill $bill): string
    {
        $bill->loadMissing(['visit.patient', 'items', 'patient']);

        $pdf = Pdf::loadView('pdf.receipt', [
            'bill' => $bill,
            'hospital' => config('hospital.hospital'),
        ]);

        $pdf->setPaper('A4', 'portrait');

        return $pdf->output();
    }

    /**
     * Generate a PDF report and save it to the disk.
     * Returns the relative storage path to the generated PDF.
     */
    public function generateReportFile(string $viewName, array $data, string $orientation = 'landscape'): string
    {
        $pdf = Pdf::loadView($viewName, [
            ...$data,
            'hospital' => config('hospital.hospital'),
            'generated_at' => now()->format('Y-m-d H:i:s'),
        ]);

        $pdf->setPaper('A4', $orientation);

        $uuid = Str::uuid()->toString();
        $path = "pdf-exports/{$uuid}.pdf";

        Storage::disk($this->getDisk())->put($path, $pdf->output());

        return $path;
    }

    /**
     * Determine the storage disk to use. Local 'pdf' disk for now, S3 later.
     */
    private function getDisk(): string
    {
        return config('filesystems.default') === 's3' ? 's3' : 'pdf';
    }
}
