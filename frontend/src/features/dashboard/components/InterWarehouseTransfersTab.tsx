import { ArrowLeftRight } from 'lucide-react';
import type { StockTransaction } from '../model/inventoryTypes';

interface Props {
  warehouseName: string;
  transactions: StockTransaction[];
  isLoading: boolean;
  onInitiateTransfer: () => void;
}

export function InterWarehouseTransfersTab({
  warehouseName,
  transactions,
  isLoading,
  onInitiateTransfer,
}: Props) {
  const transferTx = transactions.filter(
    (t) => t.type === 'transfer_out' || t.type === 'transfer_in'
  );

  return (
    <div className="space-y-6">
      {/* Transfer Initiator Card */}
      <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
              <ArrowLeftRight className="h-3 w-3" />
              Inter-Warehouse Logistics
            </span>
            <h2 className="text-xl font-bold tracking-tight text-gray-900">
              Exchange or Transfer Products with Another Warehouse
            </h2>
            <p className="text-xs text-gray-500">
              Move stock from <strong>{warehouseName}</strong> to any destination warehouse.
              Add individual or multiple product variants, specify quantities, and execute atomic inter-facility transfers.
            </p>
          </div>
          <button
            type="button"
            onClick={onInitiateTransfer}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all cursor-pointer shrink-0 self-start sm:self-center"
          >
            <ArrowLeftRight className="h-4 w-4" />
            <span>Initiate Exchange / Transfer</span>
          </button>
        </div>
      </div>

      {/* Filtered Transfer Audit History */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-4 sm:px-6 border-b border-gray-100 bg-slate-50/70 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Transfer Movement History</h3>
            <p className="text-xs text-gray-500">Inbound and outbound inter-facility stock movements</p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-gray-400">Loading transfers…</div>
        ) : transferTx.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <ArrowLeftRight className="mx-auto h-8 w-8 text-gray-300 mb-2" />
            <p className="text-xs font-semibold">No transfer movements recorded yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {transferTx.map((tx) => {
              const isOut = tx.type === 'transfer_out';
              return (
                <div
                  key={tx.id}
                  className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50/50 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-gray-900 text-xs">
                        {tx.variant_sku}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border ${
                          isOut
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-teal-50 text-teal-700 border-teal-200'
                        }`}
                      >
                        <ArrowLeftRight className="h-3 w-3" />
                        {isOut ? 'Transferred Out (Dispatched)' : 'Transferred In (Received)'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 flex flex-wrap items-center gap-x-2.5">
                      <span>{new Date(tx.created_at).toLocaleString()}</span>
                      <span>•</span>
                      <span>Facility: <strong>{tx.warehouse_name}</strong></span>
                      {tx.performed_by && (
                        <>
                          <span>•</span>
                          <span>By: <strong>{tx.performed_by}</strong></span>
                        </>
                      )}
                      {tx.notes && (
                        <>
                          <span>•</span>
                          <span className="text-gray-700 italic">"{tx.notes}"</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right font-mono font-black text-sm">
                    <span className={isOut ? 'text-rose-600' : 'text-teal-600'}>
                      {isOut ? `-${tx.quantity_change}` : `+${tx.quantity_change}`} units
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
