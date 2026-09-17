import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowLeftRight,
  Warehouse,
  AlertCircle,
  Plus,
  Trash2,
  Package,
} from 'lucide-react';
import type {
  WarehouseInventoryItem,
  WarehouseOption,
  StockTransferPayload,
} from '../model/inventoryTypes';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  inventoryItem: WarehouseInventoryItem | null;
  availableInventory: WarehouseInventoryItem[];
  currentWarehouseId: number | null;
  currentWarehouseName: string;
  warehouses: WarehouseOption[];
  onSubmit: (payload: StockTransferPayload) => void;
  isPending: boolean;
}

interface TransferRow {
  variant_id: number | '';
  quantity: number;
}

export function StockTransferModal({
  isOpen,
  onClose,
  inventoryItem,
  availableInventory,
  currentWarehouseId,
  currentWarehouseName,
  warehouses,
  onSubmit,
  isPending,
}: Props) {
  // Other destination warehouses
  const targetWarehouseOptions = warehouses.filter(
    (w) => !currentWarehouseId || w.id !== currentWarehouseId
  );

  const [targetWarehouseId, setTargetWarehouseId] = useState<number | ''>('');
  const [rows, setRows] = useState<TransferRow[]>([]);
  const [notes, setNotes] = useState('');

  // Sync state when modal opens or initial target item changes
  useEffect(() => {
    if (isOpen) {
      if (targetWarehouseOptions.length > 0 && !targetWarehouseId) {
        setTargetWarehouseId(targetWarehouseOptions[0].id);
      }
      if (inventoryItem) {
        setRows([
          {
            variant_id: inventoryItem.variant,
            quantity: Math.min(1, inventoryItem.available_stock || 1),
          },
        ]);
      } else if (availableInventory.length > 0) {
        const first = availableInventory[0];
        setRows([
          {
            variant_id: first.variant,
            quantity: Math.min(1, first.available_stock || 1),
          },
        ]);
      } else {
        setRows([]);
      }
    }
  }, [isOpen, inventoryItem, warehouses]);

  if (!isOpen) return null;

  const handleAddRow = () => {
    // Pick the first inventory item not yet added, or fallback to first
    const usedIds = new Set(rows.map((r) => r.variant_id));
    const nextItem = availableInventory.find((i) => !usedIds.has(i.variant)) || availableInventory[0];
    if (nextItem) {
      setRows((prev) => [
        ...prev,
        {
          variant_id: nextItem.variant,
          quantity: Math.min(1, nextItem.available_stock || 1),
        },
      ]);
    }
  };

  const handleRemoveRow = (idx: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleRowChange = (idx: number, field: keyof TransferRow, val: any) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: val };
      return updated;
    });
  };

  // Helper to look up available stock in source warehouse for a variant
  const getAvailableStock = (variantId: number | '') => {
    if (!variantId) return 0;
    const match = availableInventory.find((i) => i.variant === Number(variantId));
    return match ? match.available_stock : 0;
  };

  const totalQuantity = rows.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);

  // Check validity
  const hasInvalidRow = rows.some((r) => {
    if (!r.variant_id) return true;
    const avail = getAvailableStock(r.variant_id);
    return r.quantity <= 0 || r.quantity > avail;
  });

  const isValid = Boolean(targetWarehouseId) && rows.length > 0 && !hasInvalidRow;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    if (rows.length === 1) {
      onSubmit({
        target_warehouse_id: Number(targetWarehouseId),
        variant_id: Number(rows[0].variant_id),
        quantity: Number(rows[0].quantity),
        notes: notes.trim(),
      });
    } else {
      onSubmit({
        target_warehouse_id: Number(targetWarehouseId),
        items: rows.map((r) => ({
          variant_id: Number(r.variant_id),
          quantity: Number(r.quantity),
        })),
        notes: notes.trim(),
      });
    }
  };

  const selectedTargetWh = warehouses.find((w) => w.id === Number(targetWarehouseId));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Inter-Warehouse Inventory Exchange & Transfer
              </h3>
              <p className="text-xs text-gray-500">
                Transfer one or more products between warehouse stations
              </p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Facility Flow Route */}
          <div className="grid grid-cols-5 items-center gap-2 rounded-xl bg-indigo-50/60 p-3 text-xs border border-indigo-100">
            <div className="col-span-2 space-y-0.5">
              <div className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wider">
                Origin Station
              </div>
              <div className="font-bold text-gray-900 truncate">{currentWarehouseName}</div>
              <div className="text-[11px] text-gray-500">Current Station</div>
            </div>

            <div className="flex justify-center text-indigo-500">
              <ArrowLeftRight className="h-4 w-4" />
            </div>

            <div className="col-span-2 space-y-0.5">
              <div className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wider">
                Destination Station
              </div>
              <div className="font-bold text-gray-900 truncate">
                {selectedTargetWh?.name || 'Select destination facility…'}
              </div>
              <div className="text-[11px] text-indigo-600 font-semibold font-mono">
                {totalQuantity} total units
              </div>
            </div>
          </div>

          {/* Destination Warehouse Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">
              Destination Warehouse <span className="text-rose-500">*</span>
            </label>
            {targetWarehouseOptions.length === 0 ? (
              <div className="p-2.5 text-xs text-amber-800 bg-amber-50 rounded-xl border border-amber-200">
                No other warehouses registered to transfer to.
              </div>
            ) : (
              <select
                required
                value={targetWarehouseId}
                onChange={(e) => setTargetWarehouseId(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                {targetWarehouseOptions.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} {wh.location ? `— ${wh.location}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Product Variants & Units Builder */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider">
                Products & Variants to Exchange ({rows.length})
              </label>
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-all cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                <span>Add Another Variant</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {rows.map((row, idx) => {
                const avail = getAvailableStock(row.variant_id);
                const isOver = row.quantity > avail;

                return (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center gap-2.5 rounded-xl bg-gray-50/80 p-3 border border-gray-200/70"
                  >
                    {/* Variant Selector */}
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] text-gray-400 font-medium">Product SKU</span>
                        <span className="text-[10px] text-emerald-700 font-bold font-mono">
                          Avail: {avail} units
                        </span>
                      </div>
                      <select
                        value={row.variant_id}
                        onChange={(e) => handleRowChange(idx, 'variant_id', Number(e.target.value))}
                        className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 outline-none focus:border-indigo-500"
                      >
                        {availableInventory.map((item) => (
                          <option key={item.id} value={item.variant}>
                            {item.variant_sku} (Stock: {item.available_stock})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity to transfer */}
                    <div className="w-28">
                      <span className="text-[10px] text-gray-400 block mb-0.5 font-medium">Units</span>
                      <input
                        type="number"
                        min="1"
                        max={avail}
                        required
                        value={row.quantity}
                        onChange={(e) =>
                          handleRowChange(idx, 'quantity', parseInt(e.target.value) || 0)
                        }
                        className={`w-full rounded-lg border px-2.5 py-1.5 text-xs font-bold outline-none ${
                          isOver
                            ? 'border-rose-300 bg-rose-50 text-rose-700 focus:border-rose-500'
                            : 'border-gray-200 bg-white text-gray-900 focus:border-indigo-500'
                        }`}
                      />
                    </div>

                    {/* Remove row */}
                    <button
                      type="button"
                      disabled={rows.length <= 1}
                      onClick={() => handleRemoveRow(idx)}
                      className="p-1 text-gray-400 hover:text-rose-600 disabled:opacity-30 transition-all cursor-pointer self-end sm:self-center"
                      title="Remove variant from transfer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes / Transfer Memo */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">Transfer Reason / Reference Memo</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Stock balancing / replenishment request"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-indigo-500"
            />
          </div>

          {hasInvalidRow && (
            <div className="flex items-center gap-1.5 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>One or more items exceed available warehouse stock.</span>
            </div>
          )}

          {/* Footer Buttons */}
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
              disabled={isPending || !isValid}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              <span>{isPending ? 'Transferring…' : `Transfer ${totalQuantity} Unit(s)`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
