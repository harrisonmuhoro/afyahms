<?php

declare(strict_types=1);

namespace App\Modules\Billing\Services;

use App\Exceptions\Domain\ConflictException;
use App\Exceptions\Domain\NotFoundException;
use App\Models\User;
use App\Modules\Billing\Models\Bill;
use App\Modules\Billing\Models\BillItem;
use App\Modules\Queue\Models\Visit;
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
        return Bill::create([
            'branch_id'    => $visit->branch_id,
            'visit_id'     => $visit->id,
            'patient_id'   => $visit->patient_id,
            'total_amount' => 0,
            'paid_amount'  => 0,
            'status'       => 'pending',
        ]);
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
    public function recordPayment(Bill $bill, float $amount, string $method = 'cash', ?User $actor = null): Bill
    {
        return DB::transaction(function () use ($bill, $amount, $method, $actor): Bill {
            $newPaid = min($bill->paid_amount + $amount, $bill->total_amount);
            $bill->paid_amount     = $newPaid;
            $bill->payment_method  = $method;

            $wasNotCleared = !$bill->isCleared();

            if ($newPaid >= $bill->total_amount) {
                $bill->status     = 'cleared';
                $bill->cleared_by = $actor?->id;
                $bill->cleared_at = now();
            } elseif ($newPaid > 0) {
                $bill->status = 'partial';
            }

            $bill->save();

            // Send receipt if newly cleared and patient has an email
            if ($wasNotCleared && $bill->status === 'cleared' && !empty($bill->patient->email)) {
                $bill->patient->notify(new \App\Notifications\PaymentReceiptNotification($bill));
            }

            return $bill->refresh();
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
