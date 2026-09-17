import React, { useState } from 'react';
import { X, Sliders, Plus, Minus, AlertCircle } from 'lucide-react';
import type { WarehouseInventoryItem, StockAdjustPayload } from '../model/inventoryTypes';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  inventoryItem: WarehouseInventoryItem | null;
  onSubmit: (payload: StockAdjustPayload) => void;
  isPending: boolean;
}

export function StockAdjustModal({
  isOpen,
  onClose,
  inventoryItem,
  onSubmit,
  isPending,
}: Props) {
  const [direction, setDirection] = useState<'add' | 'remove'>('add');
  const [units, setUnits] = useState<number>(1);
  const [txType, setTxType] = useState<'adjustment' | 'return' | 'import'>('adjustment');
  const [notes, setNotes] = useState('');

  if (!isOpen || !inventoryItem) return null;

  const currentAvailable = inventoryItem.available_stock;
  const currentTotal = inventoryItem.stock;

  const finalQuantity = direction === 'add' ? units : -units;
  const projectedAvailable = currentAvailable + finalQuantity;
  const projectedTotal = currentTotal + finalQuantity;

  const isInvalidRemoval = direction === 'remove' && units > currentAvailable;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (units <= 0 || isInvalidRemoval) return;

    onSubmit({
      inventory_id: inventoryItem.id,
      quantity: finalQuantity,
      transaction_type: txType,
      notes: notes.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600 text-white">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Adjust Stock: {inventoryItem.variant_sku}
              </h3>
              <p className="text-xs text-gray-500">Record manual inventory corrections with audit log</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Current State Summary */}
        <div className="p-6 pb-2 space-y-4">
          <div className="grid grid-cols-2 gap-2.5 rounded-xl bg-gray-50 p-3 text-xs border border-gray-200/60">
            <div>
              <span className="text-gray-500">Current In-Stock:</span>
              <div className="text-sm font-black text-gray-900">{currentTotal} units</div>
            </div>
            <div>
              <span className="text-gray-500">Available:</span>
              <div className="text-sm font-black text-emerald-600">{currentAvailable} units</div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Action Toggle (Add vs Deduct) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">Adjustment Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDirection('add')}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer border ${
                    direction === 'add'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Plus className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Add Stock (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('remove')}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer border ${
                    direction === 'remove'
                      ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-xs'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Minus className="h-3.5 w-3.5 text-rose-600" />
                  <span>Deduct Stock (-)</span>
                </button>
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Units Count <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={units}
                onChange={(e) => setUnits(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Transaction Type / Reason */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">Audit Category</label>
              <select
                value={txType}
                onChange={(e) => setTxType(e.target.value as any)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              >
                <option value="adjustment">Manual Adjustment (Correction / Damage / Audit)</option>
                <option value="return">Restock from Return</option>
                <option value="import">Direct Inbound Supplier Stock</option>
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">Audit Reason / Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Physical inventory count discrepancy (+5)"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Preview Box */}
            <div className="rounded-xl bg-slate-50 p-3 text-xs border border-gray-200/60 flex items-center justify-between">
              <span className="text-gray-500">Projected Available:</span>
              <span className={`font-mono font-bold ${projectedAvailable < 0 ? 'text-rose-600' : 'text-gray-900'}`}>
                {currentAvailable} → {projectedAvailable} units
              </span>
            </div>

            {isInvalidRemoval && (
              <div className="flex items-center gap-1.5 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700 border border-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Cannot remove more than available stock ({currentAvailable} units).</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || isInvalidRemoval}
                className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 disabled:opacity-50 transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Sliders className="h-3.5 w-3.5" />
                <span>{isPending ? 'Saving…' : 'Confirm Adjustment'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
