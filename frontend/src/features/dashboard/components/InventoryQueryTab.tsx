import { useState, useMemo } from 'react';
import { Search, Package, AlertTriangle, Layers, Building2 } from 'lucide-react';
import type { InventoryQueryItem } from '../model/supportTypes';

interface Props {
  inventory: InventoryQueryItem[];
  isLoading: boolean;
  warehouses: { id: number; name: string; code: string }[];
}

export function InventoryQueryTab({ inventory, isLoading, warehouses }: Props) {
  const [search, setSearch] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const filtered = useMemo(() => {
    return inventory.filter((item) => {
      if (selectedWarehouse && String(item.warehouse) !== selectedWarehouse) return false;
      if (lowStockOnly && item.available_stock > item.reorder_level) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesProduct = item.product_name?.toLowerCase().includes(q);
        const matchesSku = item.variant_sku?.toLowerCase().includes(q);
        const matchesWh = item.warehouse_name?.toLowerCase().includes(q);
        if (!matchesProduct && !matchesSku && !matchesWh) return false;
      }
      return true;
    });
  }, [inventory, selectedWarehouse, lowStockOnly, search]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-xs overflow-hidden space-y-4">
      {/* ── Filter Toolbar ── */}
      <div className="p-4 border-b border-gray-100 bg-white flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product name, SKU, or warehouse…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 pl-9 pr-4 text-xs font-medium outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="rounded-xl border border-gray-200 bg-gray-50/50 py-2 px-3 text-xs font-medium outline-none focus:border-blue-500"
          >
            <option value="">All Warehouses</option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name} ({wh.code})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold border transition-all ${
              lowStockOnly
                ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Needs Reorder Only
          </button>
          <span className="text-xs font-semibold text-gray-500">
            {filtered.length} records
          </span>
        </div>
      </div>

      {/* ── Table ── */}
      {isLoading ? (
        <div className="p-8 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-16 text-center">
          <Layers className="mx-auto h-12 w-12 text-gray-300 mb-2" />
          <p className="text-sm font-semibold text-gray-700">No inventory records found</p>
          <p className="text-xs text-gray-400 mt-1">Adjust filters to inspect warehouse stock.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/75 text-gray-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Warehouse</th>
                <th className="py-3 px-4">Product / Variant SKU</th>
                <th className="py-3 px-4 text-center">Total Physical Stock</th>
                <th className="py-3 px-4 text-center">Reserved for Orders</th>
                <th className="py-3 px-4 text-center">Available Stock</th>
                <th className="py-3 px-4 text-center">Reorder Threshold</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((item) => {
                const isLow = item.available_stock <= item.reorder_level;
                const isOut = item.available_stock <= 0;

                return (
                  <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-gray-800">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-gray-400" />
                        <span>{item.warehouse_name ?? `Warehouse #${item.warehouse}`}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-gray-900">
                      <div className="flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-blue-500" />
                        <span className="font-bold">{item.product_name ?? item.variant_sku ?? `Variant #${item.variant}`}</span>
                      </div>
                      <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                        SKU: {item.variant_sku ?? `VAR-${item.variant}`}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-gray-800 text-sm">
                      {item.current_stock}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-amber-600">
                      {item.reserved_stock}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block rounded-lg px-2.5 py-1 text-xs font-bold ${
                          isOut
                            ? 'bg-rose-100 text-rose-800'
                            : isLow
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.available_stock} units
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-gray-500">
                      {item.reorder_level} units
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isOut ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          Out of Stock
                        </span>
                      ) : isLow ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <AlertTriangle className="h-3 w-3" /> Reorder Alert
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Adequate
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
