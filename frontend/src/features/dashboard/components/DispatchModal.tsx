import { useState, useEffect } from 'react';
import { X, Truck, Sparkles } from 'lucide-react';
import type { ShippingOrder, DispatchPayload } from '../model/shippingTypes';

interface Props {
  order: ShippingOrder | null;
  warehouseId?: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: DispatchPayload) => void;
  isPending: boolean;
}

const CARRIERS = [
  'BlueDart Express',
  'Delhivery Logistics',
  'DTDC Express',
  'FedEx India',
  'India Post Speed Post',
  'Ekart Logistics',
  'Shadowfax',
  'Self-Delivery / Local Fleet',
];

export function DispatchModal({
  order,
  warehouseId,
  isOpen,
  onClose,
  onSubmit,
  isPending,
}: Props) {
  const [carrier, setCarrier] = useState(CARRIERS[0]);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shipDate, setShipDate] = useState(new Date().toISOString().split('T')[0]);

  // Generate random carrier tracking code
  const handleGenerateTracking = () => {
    const prefix = carrier.split(' ')[0].toUpperCase().substring(0, 3);
    const randomDigits = Math.floor(100000000 + Math.random() * 900000000);
    setTrackingNumber(`${prefix}-${randomDigits}`);
  };

  useEffect(() => {
    if (isOpen && !trackingNumber) {
      handleGenerateTracking();
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const resolvedWarehouseId =
    warehouseId ||
    order.locked_by_warehouse ||
    order.shipment?.warehouse;

  const isWarehouseMismatch = Boolean(
    order.locked_by_warehouse &&
    warehouseId &&
    order.locked_by_warehouse !== warehouseId
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim() || isWarehouseMismatch) return;

    onSubmit({
      order_id: order.id,
      warehouse_id: resolvedWarehouseId || 0,
      carrier,
      tracking_number: trackingNumber.trim(),
      ship_date: shipDate,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Dispatch Order #{order.id}
              </h3>
              <p className="text-xs text-gray-500">Record carrier tracking & transition to Shipped</p>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Carrier Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">
              Shipping Carrier / Courier <span className="text-rose-500">*</span>
            </label>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {CARRIERS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Tracking Number */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-700">
                Waybill / Tracking Number <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateTracking}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="h-3 w-3" />
                Auto-generate
              </button>
            </div>
            <input
              type="text"
              required
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g. BLU-984729182"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-mono font-medium text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Ship Date */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">
              Dispatch Date
            </label>
            <input
              type="date"
              value={shipDate}
              onChange={(e) => setShipDate(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Recipient Summary */}
          {order.address_details && (
            <div className="rounded-xl bg-gray-50 p-3 border border-gray-200/60 text-xs text-gray-600 space-y-0.5">
              <div className="font-bold text-gray-800">
                Ship to: {order.address_details.title || order.customer_username}
              </div>
              <div className="text-[11px] text-gray-500 truncate">
                {order.address_details.street_address}, {order.address_details.city} ({order.address_details.postal_code})
              </div>
            </div>
          )}

          {isWarehouseMismatch && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              ⚠️ <strong>Station Mismatch:</strong> This order is assigned to warehouse #{order.locked_by_warehouse}, but your current station is #{warehouseId}. You can only dispatch orders for your assigned warehouse.
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !trackingNumber.trim() || isWarehouseMismatch}
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Truck className="h-3.5 w-3.5" />
              <span>{isPending ? 'Dispatching…' : 'Confirm Dispatch & Ship'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
