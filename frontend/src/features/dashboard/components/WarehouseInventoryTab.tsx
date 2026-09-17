import {
  Search,
  Package,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  ArrowLeftRight,
} from 'lucide-react';
import type { WarehouseInventoryItem } from '../model/inventoryTypes';

interface Props {
  inventory: WarehouseInventoryItem[];
  allInventoryCount: number;
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onlyNeedsReorder: boolean;
  onOnlyNeedsReorderChange: (checked: boolean) => void;
  onAdjust: (item: WarehouseInventoryItem) => void;
  onTransfer: (item: WarehouseInventoryItem) => void;
}

export function WarehouseInventoryTab({
  inventory,
  allInventoryCount,
  isLoading,
  searchQuery,
  onSearchChange,
  onlyNeedsReorder,
  onOnlyNeedsReorderChange,
  onAdjust,
  onTransfer,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbars */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-white p-4 border border-gray-100 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search SKU or variant name…"
            className="w-full rounded-xl border border-gray-200 bg-slate-50/60 pl-9 pr-4 py-2 text-xs font-medium text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyNeedsReorder}
              onChange={(e) => onOnlyNeedsReorderChange(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span>Low Stock / Reorder Only</span>
          </label>

          <span className="text-xs text-gray-300">|</span>

          <span className="text-xs font-semibold text-gray-500">
            Showing {inventory.length} of {allInventoryCount} SKUs
          </span>
        </div>
      </div>

      {/* Inventory Items Table */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-gray-400">Loading warehouse inventory…</div>
        ) : inventory.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Package className="mx-auto h-8 w-8 text-gray-300 mb-2" />
            <p className="text-xs font-semibold">No inventory items found matching this filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50/80 text-gray-500 border-b border-gray-100 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Variant / SKU</th>
                  <th className="py-3 px-4">Total Stock</th>
                  <th className="py-3 px-4">Reserved</th>
                  <th className="py-3 px-4">Available</th>
                  <th className="py-3 px-4">Reorder Level</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {inventory.map((item) => {
                  const isLow = item.available_stock <= item.reorder_level;
                  const isZero = item.available_stock <= 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-all">
                      <td className="py-3 px-4 font-mono font-bold text-gray-900">
                        {item.variant_sku}
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-700 font-mono">
                        {item.stock} units
                      </td>
                      <td className="py-3 px-4 font-semibold text-amber-600 font-mono">
                        {item.reserved_stock} units
                      </td>
                      <td className="py-3 px-4 font-black text-gray-900 font-mono">
                        <span className={isZero ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-emerald-600'}>
                          {item.available_stock} units
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500 font-mono">
                        {item.reorder_level} units
                      </td>
                      <td className="py-3 px-4">
                        {isZero ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
                            <AlertTriangle className="h-3 w-3" />
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
                            <AlertTriangle className="h-3 w-3" />
                            Needs Reorder
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" />
                            Healthy
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onAdjust(item)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-blue-700 transition-all cursor-pointer shadow-2xs"
                            title="Adjust Stock"
                          >
                            <Sliders className="h-3 w-3 text-blue-600" />
                            <span>Adjust</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onTransfer(item)}
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-all cursor-pointer shadow-2xs"
                            title="Transfer to another warehouse"
                          >
                            <ArrowLeftRight className="h-3 w-3" />
                            <span>Transfer</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
