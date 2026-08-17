<?php

declare(strict_types=1);

namespace App\Modules\Billing\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Billing\Services\BillingService;
use App\Modules\Queue\Models\Visit;
use App\Services\PdfService;
use Symfony\Component\HttpFoundation\Response;

final class ReceiptController extends Controller
{
    public function __construct(
        private readonly BillingService $billingService,
        private readonly PdfService $pdfService
    ) {
    }

    /**
     * Download or view the PDF receipt for a visit's bill.
     */
    public function show(Visit $visit): Response
    {
        $bill = $this->billingService->billForVisit($visit);

        return $this->pdfService->streamReceipt($bill);
    }
}
