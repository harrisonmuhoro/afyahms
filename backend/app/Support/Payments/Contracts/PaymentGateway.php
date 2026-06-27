<?php

declare(strict_types=1);

namespace App\Support\Payments\Contracts;

use App\Modules\Billing\Data\PaymentRequestData;
use App\Modules\Billing\Data\PaymentResultData;

/**
 * Per foundation §9 — every payment channel (M-Pesa, cash, future gateways)
 * implements this. App code calls PaymentService::charge(...) which
 * dispatches to the configured gateway.
 */
interface PaymentGateway
{
    public function name(): string;

    public function isEnabled(): bool;

    /**
     * Initiate a charge. For M-Pesa STK this returns immediately with a
     * checkout_request_id; the result lands via the async webhook.
     *
     * For Cash this returns synchronously with status=pending until the
     * cashier confirms via the CashConfirmation endpoint.
     */
    public function charge(PaymentRequestData $data): PaymentResultData;

    /**
     * Query the status of a previously initiated charge.
     */
    public function status(string $reference): PaymentResultData;
}