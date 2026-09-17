import React, { useState } from 'react';
import {
  X,
  Truck,
  Plus,
  Trash2,
  Warehouse,
  Building2,
  Calendar,
  AlertCircle,
  Package,
} from 'lucide-react';
import type {
  VendorItem,
  ProductVariantOption,
  CreateImportPayload,
} from '../model/inventoryTypes';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  warehouseId: number | null;
  warehouseName: string;
  vendors: VendorItem[];
  variants: ProductVariantOption[];
  onOpenCreateVendor: () => void;
  onSubmit: (payload: CreateImportPayload) => void;
  isPending: boolean;
}

interface LineItemState {
  variant_id: number | '';
  quantity: number;
  unit_cost: number;
}

export function InitiateImportModal({
  isOpen,
  onClose,
  warehouseId,
  warehouseName,
  vendors,
  variants,
  onOpenCreateVendor,
  onSubmit,
  isPending,
}: Props) {
  const [vendorId, setVendorId] = useState<number | ''>(vendors[0]?.id ?? '');
  const [importDate, setImportDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [items, setItems] = useState<LineItemState[]>([
    {
      variant_id: variants[0]?.id ?? '',
      quantity: 10,
      unit_cost: parseFloat(variants[0]?.price || '500') * 0.6,
    },
  ]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    const firstVar = variants[0];
    setItems((prev) => [
      ...prev,
      {
        variant_id: firstVar?.id ?? '',
        quantity: 10,
        unit_cost: parseFloat(firstVar?.price || '500') * 0.6,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof LineItemState, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      if (field === 'variant_id') {
        const found = variants.find((v) => v.id === Number(value));
        if (found) {
          // Default purchase unit cost to 60% of retail price
          item.unit_cost = Math.round(parseFloat(found.price || '500') * 0.6);
        }
      }
      updated[index] = item;
      return updated;
    });
  };

  const grandTotal = items.reduce(
    (acc, curr) => acc + (Number(curr.quantity) || 0) * (Number(curr.unit_cost) || 0),
    0
  );

  const isValid =
    Boolean(vendorId) &&
    items.length > 0 &&
    items.every((i) => i.variant_id && i.quantity > 0 && i.unit_cost >= 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    onSubmit({
      vendor_id: Number(vendorId),
      warehouse_id: warehouseId ?? undefined,
      import_date: importDate,
      items: items.map((i) => ({
        variant_id: Number(i.variant_id),
        quantity: Number(i.quantity),
        unit_cost: Number(i.unit_cost),
      })),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Initiate Warehouse Goods Import</h3>
              <p className="text-xs text-gray-500">
                Order goods from suppliers to replenish this warehouse
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Warehouse Station Pre-fill */}
          <div className="flex items-center justify-between rounded-xl bg-emerald-50/60 p-3 text-xs border border-emerald-100">
            <div className="flex items-center gap-2 text-emerald-800">
              <Warehouse className="h-4 w-4 text-emerald-600" />
              <span>Receiving Facility:</span>
              <strong className="font-bold text-emerald-950">{warehouseName}</strong>
              {warehouseId && (
                <span className="rounded bg-emerald-200/60 px-1.5 py-0.2 font-mono text-[11px] text-emerald-900">
                  Station #{warehouseId}
                </span>
              )}
            </div>
            <span className="text-[11px] text-emerald-700 font-medium">Warehouse Initiated</span>
          </div>

          {/* Supplier Picker + Quick Add */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-700">
                  Select Supplier / Vendor <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={onOpenCreateVendor}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>New Vendor</span>
                </button>
              </div>
              <select
                required
                value={vendorId}
                onChange={(e) => setVendorId(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Expected Arrival Date */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">Expected Arrival Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="date"
                  value={importDate}
                  onChange={(e) => setImportDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-xs text-gray-900 outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Line Items Section */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider">
                Manifest Items ({items.length})
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Product Variant</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {items.map((item, idx) => {
                const subtotal = (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0);

                return (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center gap-2.5 rounded-xl bg-gray-50/80 p-3 border border-gray-200/70"
                  >
                    {/* Variant Selector */}
                    <div className="flex-1 min-w-[200px]">
                      <span className="text-[10px] text-gray-400 block mb-0.5 font-medium">
                        Product Variant / SKU
                      </span>
                      <select
                        value={item.variant_id}
                        onChange={(e) => handleItemChange(idx, 'variant_id', Number(e.target.value))}
                        className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 outline-none focus:border-emerald-500"
                      >
                        {variants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.sku} — {v.product_name || 'Product'} {v.color ? `(${v.color})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="w-24">
                      <span className="text-[10px] text-gray-400 block mb-0.5 font-medium">Quantity</span>
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(idx, 'quantity', parseInt(e.target.value) || 0)
                        }
                        className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-900 outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Unit Cost */}
                    <div className="w-28">
                      <span className="text-[10px] text-gray-400 block mb-0.5 font-medium">
                        Unit Cost (₹)
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        required
                        value={item.unit_cost}
                        onChange={(e) =>
                          handleItemChange(idx, 'unit_cost', parseFloat(e.target.value) || 0)
                        }
                        className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-900 outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Subtotal */}
                    <div className="w-28 text-right self-end sm:self-center pr-1">
                      <span className="text-[10px] text-gray-400 block mb-0.5 font-medium">Subtotal</span>
                      <div className="text-xs font-mono font-bold text-gray-900">
                        ₹{subtotal.toLocaleString()}
                      </div>
                    </div>

                    {/* Delete item button */}
                    <button
                      type="button"
                      disabled={items.length <= 1}
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1 text-gray-400 hover:text-rose-600 disabled:opacity-30 transition-all cursor-pointer self-end sm:self-center"
                      title="Remove row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grand Total Summary Box */}
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 font-medium">Total Purchase Commitment:</div>
              <div className="text-xl font-bold text-gray-900 font-mono">
                ₹{grandTotal.toLocaleString()}
              </div>
            </div>
            <div className="text-right text-xs text-gray-500">
              <span className="font-semibold text-gray-700">{items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0)} units</span>
              <div className="text-[11px] text-gray-400">Status: Scheduled (Pending)</div>
            </div>
          </div>

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
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Truck className="h-4 w-4" />
              <span>{isPending ? 'Submitting Order…' : 'Initiate Import Order'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
