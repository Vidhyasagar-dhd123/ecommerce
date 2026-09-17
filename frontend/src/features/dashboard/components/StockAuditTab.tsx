import { useState } from 'react';
import {
  ShieldCheck,
  Plus,
  Minus,
  Truck,
  RotateCcw,
  Sliders,
  ArrowRightLeft,
  Filter,
} from 'lucide-react';
import type { StockTransactionItem } from '../model/inventoryTypes';

interface Props {
  transactions: StockTransactionItem[];
  isLoading: boolean;
}

const TYPE_CONFIG: Record<
  string,
  { label: string; badgeCls: string; icon: any }
> = {
  import: { label: 'Inbound Import', badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Truck },
  ship: { label: 'Order Dispatched', badgeCls: 'bg-blue-50 text-blue-700 border-blue-200', icon: Truck },
  sale: { label: 'Sale', badgeCls: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Minus },
  return: { label: 'Customer Return', badgeCls: 'bg-purple-50 text-purple-700 border-purple-200', icon: RotateCcw },
  adjustment: { label: 'Manual Adjustment', badgeCls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Sliders },
  transfer_out: { label: 'Transfer Out (Sent)', badgeCls: 'bg-rose-50 text-rose-700 border-rose-200', icon: ArrowRightLeft },
  transfer_in: { label: 'Transfer In (Received)', badgeCls: 'bg-teal-50 text-teal-700 border-teal-200', icon: ArrowRightLeft },
};

export function StockAuditTab({ transactions, isLoading }: Props) {
  const [filterType, setFilterType] = useState<string>('');

  const filteredTransactions = filterType
    ? transactions.filter((t) => t.type === filterType)
    : transactions;

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-xs overflow-hidden">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 bg-slate-50/70 p-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-slate-200 p-2 text-slate-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Immutable Stock Audit Ledger</h2>
            <p className="text-xs text-gray-500">Every physical stock movement is permanently logged</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 outline-none focus:border-amber-500"
          >
            <option value="">All Movement Types</option>
            <option value="transfer_out">Transfers Out (Sent)</option>
            <option value="transfer_in">Transfers In (Received)</option>
            <option value="import">Vendor Imports</option>
            <option value="ship">Order Shipments</option>
            <option value="return">Customer Returns</option>
            <option value="adjustment">Manual Adjustments</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs text-gray-400">Loading audit log records…</div>
      ) : filteredTransactions.length === 0 ? (
        <div className="p-12 text-center text-gray-400">
          <ShieldCheck className="mx-auto h-8 w-8 text-gray-300 mb-2" />
          <p className="text-xs font-semibold">No stock movements found matching this filter.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {filteredTransactions.map((tx) => {
            const config = TYPE_CONFIG[tx.type] || {
              label: tx.type,
              badgeCls: 'bg-gray-100 text-gray-700 border-gray-200',
              icon: Sliders,
            };
            const Icon = config.icon;
            const isPositive = tx.quantity > 0;

            return (
              <div key={tx.id} className="p-4 sm:px-6 hover:bg-slate-50/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-gray-900 text-xs">
                      {tx.variant_sku}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border ${config.badgeCls}`}>
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </span>
                  </div>

                  <div className="text-xs text-gray-500 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span>{new Date(tx.created_at).toLocaleString()}</span>
                    {tx.performed_by && (
                      <>
                        <span>•</span>
                        <span>By: <strong>{tx.performed_by}</strong></span>
                      </>
                    )}
                    {tx.reference_id && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-gray-600">Ref: {tx.reference_id}</span>
                      </>
                    )}
                    {tx.notes && (
                      <>
                        <span>•</span>
                        <span className="text-gray-700 italic font-normal">"{tx.notes}"</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Net change pill */}
                <div className="shrink-0">
                  <span
                    className={`inline-flex items-center gap-1 rounded-xl px-3 py-1 text-xs font-black font-mono border ${
                      isPositive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {isPositive ? <Plus className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                    <span>{Math.abs(tx.quantity)} units</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
