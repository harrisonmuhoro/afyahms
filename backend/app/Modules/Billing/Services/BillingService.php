<?php

declare(strict_types=1);

namespace App\Modules\Billing\Services;

use App\Exceptions\Domain\ConflictException;
use App\Exceptions\Domain\NotFoundException;
use App\Models\User;
use App\Modules\Billing\Models\Bill;
use App\Modules\Billing\Models\BillItem;
use App\Modules\Billing\Models\BillPayment;
use App\Modules\Queue\Models\Visit;
use App\Modules\Appointments\Models\Appointment;
use App\Modules\Tenancy\Scopes\BranchScope;
use Illuminate\Support\Facades\DB;

/**
 * Billing domain service.
 *
 * Responsibilities:
 *  - Create a bill when a visit is opened.
 *  - Add / remove line-items.
 *  - Mark a bill as cleared (payment confirmed).
 *  - Determine whether a visit's bill has been cleared (used by
 *    the Billing station gate before discharging a patient).
 */
final class BillingService
{
    /**
     * Create a new pending bill for a visit.
     * Called by QueueService::openVisit() inside the same DB transaction.
     */
    public function createForVisit(Visit $visit): Bill
    {
        $bill = Bill::create([
            'branch_id'    => $visit->branch_id,
            'visit_id'     => $visit->id,
            'patient_id'   => $visit->patient_id,
            'total_amount' => 0,
            'paid_amount'  => 0,
            'status'       => 'pending',
        ]);

        $appointment = $visit->appointment_id === null
            ? null
            : Appointment::withoutGlobalScopes()->find($visit->appointment_id);
        $fee = $appointment === null
            ? 0.0
            : (float) (config('appointments.consultation_fees.'.($appointment->type ?: 'follow_up'), 0));

        if ($fee > 0) {
            $this->addItem($bill, [
                'description' => ucfirst(str_replace('_', ' ', (string) ($appointment->type ?: 'consultation'))).' consultation',
                'category' => 'consultation',
                'unit_price' => $fee,
                'quantity' => 1,
            ]);
        }

        return $bill->refresh();
    }

    /**
     * Add a line-item to an existing bill and recalculate total_amount.
     *
     * @param array<string, mixed> $itemData
     */
    public function addItem(Bill $bill, array $itemData): BillItem
    {
        return DB::transaction(function () use ($bill, $itemData): BillItem {
            $unitPrice  = (float) ($itemData['unit_price'] ?? 0);
            $quantity   = (int)   ($itemData['quantity']   ?? 1);
            $totalPrice = $unitPrice * $quantity;

            $item = BillItem::create([
                'bill_id'     => $bill->id,
                'description' => (string) ($itemData['description'] ?? ''),
                'category'    => (string) ($itemData['category']    ?? 'service'),
                'unit_price'  => $unitPrice,
                'quantity'    => $quantity,
                'total_price' => $totalPrice,
            ]);

            $bill->increment('total_amount', $totalPrice);
            $this->recalculateStatus($bill);

            return $item;
        });
    }

    /**
     * Record a payment against the bill.
     *
     * @param array<string, mixed> $paymentData
     */
    public function recordPayment(
        Bill $bill,
        float $amount,
        string $method = 'cash',
        ?User $actor = null,
        ?string $reference = null,
        ?string $idempotencyKey = null,
        array $metadata = [],
    ): Bill
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException('Payment amount must be greater than zero.');
        }

        return DB::transaction(function () use ($bill, $amount, $method, $actor, $reference, $idempotencyKey, $metadata): Bill {
            /** @var Bill $lockedBill */
            $lockedBill = Bill::withoutGlobalScope(BranchScope::class)
                ->whereKey($bill->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            $existingPayment = ($reference !== null || $idempotencyKey !== null)
                ? BillPayment::query()
                    ->where(function ($query) use ($reference, $idempotencyKey): void {
                        if ($reference !== null) {
                            $query->where('reference', $reference);
                        }
                        if ($idempotencyKey !== null) {
                            $method = $reference === null ? 'where' : 'orWhere';
                            $query->{$method}('idempotency_key', $idempotencyKey);
                        }
                    })
                    ->first()
                : null;

            if ($existingPayment !== null) {
                if ((int) $existingPayment->bill_id !== (int) $lockedBill->id) {
                    throw new ConflictException('Payment reference has already been used.', 409);
                }

                return $lockedBill->refresh();
            }

            if ($lockedBill->isCleared()) {
                throw new ConflictException('Bill is already cleared and cannot accept further payments.', 409);
            }

            $balance = max(0, (float) $lockedBill->total_amount - (float) $lockedBill->paid_amount);
            $appliedAmount = min($amount, $balance);
            if ($appliedAmount <= 0) {
                throw new ConflictException('Bill has no outstanding balance.', 409);
            }

            BillPayment::create([
                'bill_id' => $lockedBill->id,
                'amount' => round($amount, 2),
                'applied_amount' => round($appliedAmount, 2),
                'method' => $method,
                'reference' => $reference,
                'idempotency_key' => $idempotencyKey,
                'received_by' => $actor?->id,
                'metadata' => $metadata ?: null,
            ]);

            $newPaid = min((float) $lockedBill->paid_amount + $appliedAmount, (float) $lockedBill->total_amount);
            $lockedBill->paid_amount = $newPaid;
            $lockedBill->payment_method = $method;

            $wasNotCleared = ! $lockedBill->isCleared();

            if ($newPaid >= $lockedBill->total_amount) {
                $lockedBill->status     = 'cleared';
                $lockedBill->cleared_by = $actor?->id;
                $lockedBill->cleared_at = now();
            } elseif ($newPaid > 0) {
                $lockedBill->status = 'partial';
            }

            $lockedBill->save();

            // Send receipt if newly cleared and patient has an email.
            // Wrapped in rescue() so a mail-delivery failure (e.g. Resend sandbox
            // restrictions in local dev) never rolls back the payment transaction.
            if ($wasNotCleared && $lockedBill->status === 'cleared' && ! empty($lockedBill->patient->email)) {
                rescue(
                    fn () => $lockedBill->patient->notify(new \App\Notifications\PaymentReceiptNotification($lockedBill)),
                    fn (\Throwable $e) => logger()->warning('Payment receipt notification failed', [
                        'bill_id' => $lockedBill->id,
                        'error'   => $e->getMessage(),
                    ]),
                    report: false,
                );
            }

            return $lockedBill->refresh();
        });
    }

    /**
     * Mark a bill as cleared/waived by staff override.
     */
    public function markCleared(Bill $bill, string $reason = '', ?User $actor = null): Bill
    {
        if ($bill->isCleared()) {
            throw new ConflictException('Bill is already cleared.', 409, ['code' => 'BILL_ALREADY_CLEARED']);
        }

        $bill->update([
            'status'         => 'cleared',
            'paid_amount'    => $bill->total_amount,
            'notes'          => $reason ?: $bill->notes,
            'cleared_by'     => $actor?->id,
            'cleared_at'     => now(),
        ]);

        return $bill->refresh();
    }

    /**
     * Mark a bill as waived (patient exempt from payment).
     */
    public function markWaived(Bill $bill, string $reason = '', ?User $actor = null): Bill
    {
        $bill->update([
            'status'     => 'waived',
            'notes'      => $reason ?: $bill->notes,
            'cleared_by' => $actor?->id,
            'cleared_at' => now(),
        ]);

        return $bill->refresh();
    }

    /**
     * Find a bill by visit — throws NotFoundException if missing.
     */
    public function billForVisit(Visit $visit): Bill
    {
        $bill = Bill::query()->where('visit_id', $visit->id)->first();

        if ($bill === null) {
            // Auto-create if somehow missing (e.g. older visits before billing was added).
            $bill = $this->createForVisit($visit);
        }

        return $bill;
    }

    /**
     * Check whether a visit's bill has been cleared.
     * Used by the Billing station before discharging a patient.
     */
    public function isBillCleared(Visit $visit): bool
    {
        $bill = Bill::query()->where('visit_id', $visit->id)->first();

        // If no bill exists, treat as cleared (pre-billing system visits).
        if ($bill === null) {
            return true;
        }

        return $bill->isCleared();
    }

    /** Recalculate status based on paid vs total. */
    private function recalculateStatus(Bill $bill): void
    {
        if ($bill->paid_amount >= $bill->total_amount && $bill->total_amount > 0) {
            $bill->status = 'cleared';
        } elseif ($bill->paid_amount > 0) {
            $bill->status = 'partial';
        } else {
            $bill->status = 'pending';
        }
        $bill->save();
    }
}
