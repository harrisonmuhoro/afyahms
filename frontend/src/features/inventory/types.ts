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

export type StockStatus = 'in_stock' | 'low' | 'out';

/** Derive a stock status from on-hand quantity vs. reorder level. */
export function stockStatus(item: InventoryItem): StockStatus {
  if (item.quantity_on_hand <= 0) return 'out';
  if (item.quantity_on_hand <= item.reorder_level) return 'low';
  return 'in_stock';
}
