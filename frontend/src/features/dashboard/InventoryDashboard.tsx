import { useMemo, useState } from 'react';
import { useInventoryItems, useInventoryKpis, useExpiringBatches, useSuppliers, usePurchaseOrders } from '@/features/inventory/api';
import { stockStatus } from '@/features/inventory/types';
import type { InventoryItem, PurchaseOrderStatus } from '@/features/inventory/types';
import { Glyph } from '@/components/icons/Glyph';

const CATEGORY_FILTERS = ['All Items', 'Medication', 'Consumables', 'Lab Reagents'] as const;

function formatMoney(value: number): string {
  return `KSh ${value.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
}

function expiryParts(iso: string): { month: string; day: string; daysLeft: number } {
  const date = new Date(iso);
  return {
    month: date.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
    day: String(date.getDate()).padStart(2, '0'),
    daysLeft: Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000)),
  };
}

const PO_STATUS_CHIP: Record<PurchaseOrderStatus, string> = {
  draft: 'bg-surface-container-high text-on-surface-variant',
  submitted: 'bg-tertiary-container/10 text-tertiary',
  approved: 'bg-secondary-container/20 text-secondary',
  shipped: 'bg-primary-container/10 text-primary',
  received: 'bg-secondary-container/20 text-secondary',
  cancelled: 'bg-error-container/20 text-error',
};

function itemIcon(category: string | null): string {
  const c = (category ?? '').toLowerCase();
  if (c.includes('medic') || c.includes('drug') || c.includes('pharma')) return 'pill';
  if (c.includes('lab') || c.includes('reagent')) return 'science';
  if (c.includes('vaccine') || c.includes('inject')) return 'vaccines';
  return 'inventory_2';
}

function StockRow({ item }: { item: InventoryItem }): JSX.Element {
  const status = stockStatus(item);
  const low = status !== 'in_stock';

  return (
    <tr className="hover:bg-surface-container-low/50 transition-colors group">
      <td className="px-md py-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded flex items-center justify-center ${
              low ? 'bg-error-container/10 text-error' : 'bg-primary-container/10 text-primary'
            }`}
          >
            <Glyph name={itemIcon(item.category)} size={20} />
          </div>
          <div>
            <p className="text-body-md font-semibold text-on-surface">{item.name}</p>
            <p className="text-[11px] text-on-surface-variant">{item.unit}</p>
          </div>
        </div>
      </td>
      <td className="px-md py-4 text-body-md text-on-surface-variant">{item.category ?? '—'}</td>
      <td className="px-md py-4 font-data-mono text-body-sm text-secondary">{item.sku}</td>
      <td className="px-md py-4">
        <p className={`text-body-md font-bold font-data-mono ${low ? 'text-error' : ''}`}>
          {item.quantity_on_hand.toLocaleString()}{' '}
          <span className="text-body-sm font-normal text-on-surface-variant">{item.unit}</span>
        </p>
        <p className={`text-[11px] ${low ? 'text-error font-medium' : 'text-on-surface-variant'}`}>
          Reorder: {item.reorder_level.toLocaleString()}
        </p>
      </td>
      <td className="px-md py-4 text-center">
        {status === 'out' ? (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-error-container/40 text-error border border-error/20 inline-flex items-center gap-1">
            <Glyph name="block" size={13} />
            Out of Stock
          </span>
        ) : status === 'low' ? (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-error-container/20 text-error border border-error/10 inline-flex items-center gap-1">
            <Glyph name="warning" size={13} />
            Low Stock
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-secondary-container/20 text-secondary border border-secondary/10 inline-flex items-center gap-1">
            <Glyph name="check" size={13} />
            In Stock
          </span>
        )}
      </td>
    </tr>
  );
}

/**
 * Inventory & supply-chain dashboard wired to the Inventory backend module:
 * KPI summary, stock table with category filters + low-stock indicators,
 * expiry watchlist, recent purchase orders and top suppliers.
 */
export function InventoryDashboard(): JSX.Element {
  const [category, setCategory] = useState<(typeof CATEGORY_FILTERS)[number]>('All Items');
  const [search, setSearch] = useState('');

  const { data: kpis, isLoading: kpisLoading } = useInventoryKpis();
  const { data: items, isLoading: itemsLoading, error: itemsError } = useInventoryItems({ search });
  const { data: expiring } = useExpiringBatches(30);
  const { data: suppliers } = useSuppliers();
  const { data: purchaseOrders } = usePurchaseOrders();

  const filteredItems = useMemo(() => {
    if (category === 'All Items') return items;
    return items.filter((i) => (i.category ?? '').toLowerCase().includes(category.split(' ')[0].toLowerCase()));
  }, [items, category]);

  const activePOs = useMemo(
    () => purchaseOrders.filter((po) => po.status !== 'received' && po.status !== 'cancelled'),
    [purchaseOrders],
  );

  const topSuppliers = useMemo(
    () =>
      [...suppliers]
        .filter((s) => s.is_active)
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        .slice(0, 4),
    [suppliers],
  );

  return (
    <div className="p-lg space-y-lg flex-1 min-h-[calc(100vh-64px)] bg-background">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Inventory &amp; Supply Chain</h2>
          <p className="text-body-md text-on-surface-variant mt-1">
            Real-time oversight of hospital consumables and pharmacy stock.
          </p>
        </div>
        <div className="relative">
          <Glyph name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items or SKU…"
            aria-label="Search inventory"
            className="pl-10 pr-4 py-[9px] w-64 border border-outline-variant bg-surface rounded-lg text-body-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
        <div className="bg-surface p-md rounded-xl border border-outline-variant shadow-card">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-primary-container/10 rounded-lg text-primary">
              <Glyph name="payments" />
            </div>
          </div>
          <p className="text-body-sm text-on-surface-variant font-medium">Total Inventory Value</p>
          <h3 className="text-headline-lg font-bold mt-1 font-data-mono">
            {kpisLoading ? '…' : formatMoney(kpis?.total_inventory_value ?? 0)}
          </h3>
        </div>
        <div className="bg-surface p-md rounded-xl border border-outline-variant shadow-card">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-error-container/20 rounded-lg text-error">
              <Glyph name="warning" />
            </div>
            {(kpis?.low_stock_count ?? 0) > 0 && (
              <span className="text-[12px] font-bold text-error px-2 py-0.5 bg-error-container/10 rounded-full">
                Critical
              </span>
            )}
          </div>
          <p className="text-body-sm text-on-surface-variant font-medium">Below Reorder Level</p>
          <h3 className="text-headline-lg font-bold mt-1 font-data-mono">
            {kpisLoading ? '…' : `${kpis?.low_stock_count ?? 0} Items`}
          </h3>
        </div>
        <div className="bg-surface p-md rounded-xl border border-outline-variant shadow-card">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-tertiary-container/10 rounded-lg text-tertiary">
              <Glyph name="event_busy" />
            </div>
            <span className="text-[12px] font-bold text-tertiary px-2 py-0.5 bg-tertiary-container/5 rounded-full">
              30 Days
            </span>
          </div>
          <p className="text-body-sm text-on-surface-variant font-medium">Expiring Soon</p>
          <h3 className="text-headline-lg font-bold mt-1 font-data-mono">
            {kpisLoading ? '…' : `${kpis?.expiring_soon_count ?? 0} Batches`}
          </h3>
        </div>
        <div className="bg-surface p-md rounded-xl border border-outline-variant shadow-card">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-secondary-container/20 rounded-lg text-secondary">
              <Glyph name="shopping_cart" />
            </div>
            {(kpis?.active_po_count ?? 0) > 0 && (
              <span className="text-[12px] font-bold text-secondary px-2 py-0.5 bg-secondary-container/10 rounded-full">
                Pending
              </span>
            )}
          </div>
          <p className="text-body-sm text-on-surface-variant font-medium">Active Purchase Orders</p>
          <h3 className="text-headline-lg font-bold mt-1 font-data-mono">
            {kpisLoading ? '…' : `${kpis?.active_po_count ?? 0} Orders`}
          </h3>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-12 gap-gutter">
        {/* Stock Management Table Section */}
        <div className="col-span-12 lg:col-span-9 space-y-gutter">
          <div className="bg-surface rounded-xl border border-outline-variant shadow-card overflow-hidden">
            <div className="p-md border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest">
              <div className="flex items-center gap-4">
                <h4 className="font-headline-md text-headline-md">Stock Inventory</h4>
                <div className="flex gap-2">
                  {CATEGORY_FILTERS.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setCategory(filter)}
                      aria-pressed={category === filter}
                      className={`px-3 py-1 text-[11px] font-bold rounded-full cursor-pointer transition-colors ${
                        category === filter
                          ? 'bg-primary text-white'
                          : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-variant'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low border-b border-outline-variant">
                  <tr>
                    <th className="px-md py-4 text-label-caps font-label-caps text-on-surface-variant uppercase">
                      Item Name
                    </th>
                    <th className="px-md py-4 text-label-caps font-label-caps text-on-surface-variant uppercase">
                      Category
                    </th>
                    <th className="px-md py-4 text-label-caps font-label-caps text-on-surface-variant uppercase">
                      SKU
                    </th>
                    <th className="px-md py-4 text-label-caps font-label-caps text-on-surface-variant uppercase">
                      Current Stock
                    </th>
                    <th className="px-md py-4 text-label-caps font-label-caps text-on-surface-variant uppercase text-center">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {itemsLoading ? (
                    <tr>
                      <td colSpan={5} className="px-md py-10 text-center text-body-md text-on-surface-variant">
                        Loading inventory…
                      </td>
                    </tr>
                  ) : itemsError !== null || filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-md py-10 text-center">
                        <Glyph name="inventory_2" size={28} className="text-outline-variant" />
                        <p className="mt-2 text-body-md text-on-surface-variant">
                          {itemsError !== null
                            ? 'Inventory service unavailable.'
                            : search !== '' || category !== 'All Items'
                              ? 'No items match your filters.'
                              : 'No inventory items yet.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => <StockRow key={item.id} item={item} />)
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-md bg-surface-container-low/30 border-t border-outline-variant">
              <p className="text-body-sm text-on-surface-variant">
                Showing {filteredItems.length} of {items.length} items
              </p>
            </div>
          </div>

          {/* Expiry Watchlist Section */}
          <div className="bg-surface rounded-xl border border-outline-variant shadow-card overflow-hidden">
            <div className="p-md border-b border-outline-variant bg-surface-container-lowest">
              <h4 className="font-headline-md text-headline-md flex items-center gap-2">
                <Glyph name="timer" className="text-error" />
                Expiry Watchlist
              </h4>
            </div>
            {expiring.length === 0 ? (
              <p className="p-md text-body-md text-on-surface-variant text-center py-8">
                No batches expiring in the next 30 days.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-outline-variant">
                {expiring.slice(0, 3).map((batch) => {
                  const { month, day, daysLeft } = expiryParts(batch.expiry_date);
                  const critical = daysLeft <= 14;
                  return (
                    <div
                      key={batch.id}
                      className={`p-md flex items-center gap-4 transition-all ${
                        critical ? 'hover:bg-error-container/5' : 'hover:bg-surface-container'
                      }`}
                    >
                      <div
                        className={`text-center p-2 rounded-lg min-w-[60px] ${
                          critical ? 'bg-error-container/20' : 'bg-surface-container-high'
                        }`}
                      >
                        <p className={`text-[10px] uppercase font-bold ${critical ? 'text-error' : 'text-on-surface-variant'}`}>
                          {month}
                        </p>
                        <p className={`text-headline-md font-bold ${critical ? 'text-error' : 'text-on-surface-variant'}`}>
                          {day}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-body-md font-semibold truncate">{batch.item?.name ?? 'Unknown item'}</p>
                        <p className="text-[11px] text-on-surface-variant font-data-mono">
                          BATCH: {batch.batch_number ?? '—'} · {batch.quantity_remaining} left
                        </p>
                        <p className={`text-[11px] mt-1 font-medium ${critical ? 'text-error' : 'text-on-surface-variant'}`}>
                          {daysLeft} days left
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Supplier & Procurement */}
        <div className="col-span-12 lg:col-span-3 space-y-gutter">
          {/* Active Purchase Orders */}
          <div className="bg-surface rounded-xl border border-outline-variant shadow-card flex flex-col h-fit">
            <div className="p-md border-b border-outline-variant flex items-center justify-between">
              <h4 className="font-headline-md text-headline-md">Recent POs</h4>
            </div>
            <div className="p-md space-y-4">
              {activePOs.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant text-center py-4">No open purchase orders.</p>
              ) : (
                activePOs.slice(0, 4).map((po, idx) => (
                  <div key={po.id}>
                    {idx > 0 && <div className="h-[1px] bg-outline-variant mb-4" />}
                    <div className="group relative">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-body-sm font-bold font-data-mono">{po.po_number}</p>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${PO_STATUS_CHIP[po.status]}`}
                        >
                          {po.status}
                        </span>
                      </div>
                      <div className="flex gap-3 items-center">
                        <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant">
                          <Glyph name={po.status === 'shipped' ? 'local_shipping' : 'description'} size={18} />
                        </div>
                        <div>
                          <p className="text-body-sm font-medium">{po.supplier?.name ?? '—'}</p>
                          <p className="text-[11px] text-on-surface-variant">
                            {po.expected_delivery_date !== null
                              ? `ETA: ${new Date(po.expected_delivery_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                              : formatMoney(po.total_amount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Suppliers */}
          <div className="bg-surface rounded-xl border border-outline-variant shadow-card h-fit">
            <div className="p-md border-b border-outline-variant">
              <h4 className="font-headline-md text-headline-md">Top Suppliers</h4>
            </div>
            <div className="p-md space-y-md">
              {topSuppliers.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant text-center py-4">No suppliers registered.</p>
              ) : (
                topSuppliers.map((supplier) => (
                  <div key={supplier.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg border border-outline-variant bg-surface-container-low flex items-center justify-center text-on-surface-variant">
                      <Glyph name="storefront" size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-md font-semibold truncate">{supplier.name}</p>
                      <div className="flex items-center gap-1">
                        {supplier.rating !== null && (
                          <>
                            <Glyph name="star" size={14} className="text-primary" />
                            <span className="text-[11px] font-bold text-on-surface-variant">
                              {supplier.rating.toFixed(1)}
                              {supplier.category !== null ? ` • ${supplier.category}` : ''}
                            </span>
                          </>
                        )}
                        {supplier.rating === null && supplier.category !== null && (
                          <span className="text-[11px] font-bold text-on-surface-variant">{supplier.category}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Inventory Value Chart Area (Placeholder for viz) */}
          <div className="bg-primary/5 rounded-xl border border-primary/20 p-md relative overflow-hidden group">
            <div className="relative z-10">
              <h4 className="text-body-sm font-bold text-primary flex items-center gap-2">
                <Glyph name="trending_up" size={18} />
                Supply Forecast
              </h4>
              <p className="text-[11px] text-primary/70 mt-1">
                Projected stock-out for critical items in 12 days if POs are not processed.
              </p>
            </div>
            {/* Simple CSS background pattern instead of JS chart for visual filler */}
            <div 
              className="absolute bottom-0 left-0 w-full h-12 opacity-20 pointer-events-none group-hover:opacity-30 transition-opacity" 
              style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #00685f 10px, #00685f 20px)' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
