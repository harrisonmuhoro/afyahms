<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use App\Modules\Inventory\Models\PurchaseOrder;

class StockReceivedAlert extends Notification
{
    use Queueable;

    public $purchaseOrder;

    public function __construct(PurchaseOrder $purchaseOrder)
    {
        $this->purchaseOrder = $purchaseOrder;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Stock Received',
            'message' => "Purchase Order #{$this->purchaseOrder->po_number} has been received into inventory.",
            'icon' => 'box',
            'po_id' => $this->purchaseOrder->id,
        ];
    }
}
