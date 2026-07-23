/** Inventory item as returned by the Inventory module API. */
export interface InventoryItem {
  id: number;
  sku: string;
  name: string;
  category: string | null;
  unit: string;
  quantity_on_hand: number;
  reorder_level: number;
  unit_cost: number | null;
  expiry_date: string | null;
  branch: { id: number; code: string; name: string } | null;
}

/** KPI summary from GET /inventory/kpi-summary. */
export interface InventoryKpiSummary {
  total_inventory_value: number;
  low_stock_count: number;
  expiring_soon_count: number;
  active_po_count: number;
}

/** Batch nearing expiry from GET /inventory/batches/expiring. */
export interface ExpiringBatch {
  id: number;
  public_id: string;
  batch_number: string | null;
  quantity_remaining: number;
  expiry_date: string;
  item: { id: number; name: string; sku: string; unit: string } | null;
}

/** Supplier from GET /inventory/suppliers. */
export interface Supplier {
  id: number;
  public_id: string;
  name: string;
  code: string | null;
  category: string | null;
  rating: number | null;
  is_active: boolean;
}

export type PurchaseOrderStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'shipped'
  | 'received'
  | 'cancelled';

/** Purchase order from GET /inventory/purchase-orders. */
export interface PurchaseOrder {
  id: number;
  public_id: string;
  po_number: string;
  status: PurchaseOrderStatus;
  total_amount: number;
  expected_delivery_date: string | null;
  created_at: string;
  supplier: { id: number; name: string } | null;
}

export type StockStatus = 'in_stock' | 'low' | 'out';

/** Derive a stock status from on-hand quantity vs. reorder level. */
export function stockStatus(item: InventoryItem): StockStatus {
  if (item.quantity_on_hand <= 0) return 'out';
  if (item.quantity_on_hand <= item.reorder_level) return 'low';
  return 'in_stock';
}
