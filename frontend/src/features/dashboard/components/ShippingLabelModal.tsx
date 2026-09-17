import { X, Printer, Package } from 'lucide-react';
import type { ShippingOrder } from '../model/shippingTypes';

interface Props {
  order: ShippingOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ShippingLabelModal({ order, isOpen, onClose }: Props) {
  if (!isOpen || !order) return null;

  const address = order.address_details;
  const items = order.items || [];
  const trackingNumber =
    order.shipment?.tracking_number || `TRK-${order.id}${Math.floor(1000 + Math.random() * 9000)}`;
  const carrier = order.shipment?.carrier || 'Standard Express Parcel';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden my-8 print:border-none print:shadow-none print:m-0">
        {/* Modal Controls (Hidden in print) */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-slate-50 px-6 py-3.5 print:hidden">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-bold text-gray-900">
              Shipping Label & Packing Manifest
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Label</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Printable Label Content ── */}
        <div className="p-8 space-y-6 text-gray-900 font-sans print:p-6">
          {/* Label Header */}
          <div className="border-4 border-gray-900 p-5 rounded-lg space-y-4">
            <div className="flex items-center justify-between border-b-2 border-gray-900 pb-3">
              <div>
                <div className="text-2xl font-black tracking-tight font-mono">PRIORITY PARCEL</div>
                <div className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Carrier: {carrier}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase font-mono font-bold text-gray-500">Order Ref</div>
                <div className="text-xl font-black font-mono">#{order.id}</div>
              </div>
            </div>

            {/* Barcode Mock Visual */}
            <div className="flex flex-col items-center justify-center py-2 border-b-2 border-gray-900">
              {/* CSS Barcode Lines */}
              <div className="flex items-center gap-0.5 h-12 w-full max-w-sm justify-center overflow-hidden">
                {Array.from({ length: 48 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-full bg-gray-900 ${
                      i % 7 === 0 ? 'w-1.5' : i % 3 === 0 ? 'w-1' : 'w-0.5'
                    }`}
                  />
                ))}
              </div>
              <div className="font-mono text-xs font-bold tracking-widest mt-1">
                {trackingNumber}
              </div>
            </div>

            {/* Addresses Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              {/* Origin / From */}
              <div className="border-r-2 border-gray-900 pr-3 space-y-1">
                <div className="font-bold uppercase tracking-wider text-[10px] text-gray-500">
                  SHIP FROM (WAREHOUSE):
                </div>
                <div className="font-bold text-sm">
                  {order.locked_by_warehouse_name || 'Central Distribution Hub'}
                </div>
                <div className="text-gray-700 leading-snug">
                  Logistics & Fulfillment Division
                </div>
                <div className="text-[11px] text-gray-600">
                  Agent Auth: <span className="font-mono">{order.locked_by_username || 'Agent'}</span>
                </div>
              </div>

              {/* Destination / To */}
              <div className="pl-1 space-y-1">
                <div className="font-bold uppercase tracking-wider text-[10px] text-gray-500">
                  DELIVER TO:
                </div>
                <div className="font-bold text-base text-gray-900">
                  {address?.title || order.customer_username || 'Customer'}
                </div>
                <div className="text-gray-800 leading-snug font-medium">
                  {address?.street_address}
                  {address?.apartment_address && `, ${address.apartment_address}`}
                </div>
                <div className="font-bold text-sm text-gray-900">
                  {address?.city}, {address?.state} —{' '}
                  <span className="font-mono">{address?.postal_code}</span>
                </div>
                {address?.phone_number && (
                  <div className="font-mono text-xs font-bold mt-1">
                    TEL: {address.phone_number}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Packing Checklist Manifest ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-gray-300 pb-1">
              <span className="font-bold text-xs uppercase tracking-wider text-gray-700">
                Packaging Content Manifest & Verification Checklist
              </span>
              <span className="text-xs text-gray-500">
                Total Items: {items.reduce((acc, it) => acc + (it.quantity || 1), 0)}
              </span>
            </div>

            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600">
                  <th className="py-2 w-8 text-center">Pack</th>
                  <th className="py-2">Item / Description</th>
                  <th className="py-2">SKU</th>
                  <th className="py-2">Variant</th>
                  <th className="py-2 text-right">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2 text-center">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-0"
                      />
                    </td>
                    <td className="py-2 font-semibold text-gray-900">
                      {item.product_name || 'Product'}
                    </td>
                    <td className="py-2 font-mono text-[11px] text-gray-600">
                      {item.variant_details?.sku || '—'}
                    </td>
                    <td className="py-2 text-gray-600">
                      {[item.variant_details?.color, item.variant_details?.size]
                        .filter(Boolean)
                        .join(' / ') || 'Standard'}
                    </td>
                    <td className="py-2 text-right font-bold text-gray-900">
                      {item.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Dispatch Footer */}
          <div className="pt-4 border-t-2 border-dashed border-gray-300 flex items-center justify-between text-[11px] text-gray-500">
            <div>
              Generated on {new Date().toLocaleString()} by Shipping Executive
            </div>
            <div className="font-bold text-gray-700">
              Authorized Warehouse Dispatch Document
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
