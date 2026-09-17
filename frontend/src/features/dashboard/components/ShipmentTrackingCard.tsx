import { useState } from 'react';
import { Truck, Building2, CreditCard, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import type { ShipmentDetails } from '../model/shippingTypes';

interface Props {
  shipment?: ShipmentDetails | null;
  warehouseName?: string;
  totalAmount: string | number;
  className?: string;
}

export function ShipmentTrackingCard({
  shipment,
  warehouseName = 'Assigned Warehouse',
  totalAmount,
  className = '',
}: Props) {
  const [copiedTracking, setCopiedTracking] = useState(false);

  const handleCopyTracking = (trackingNum: string) => {
    void navigator.clipboard.writeText(trackingNum);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
    toast.success('Tracking number copied!');
  };

  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-4.5 space-y-3 shadow-2xs ${className}`}>
      <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
          <Truck className="h-4 w-4 text-indigo-600" />
          Carrier & Dispatch Details
        </span>
        {shipment?.tracking_number ? (
          <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
            Tracking Active
          </span>
        ) : (
          <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
            Not Dispatched Yet
          </span>
        )}
      </div>

      <div className="space-y-2.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Shipping Warehouse:</span>
          <span className="font-semibold text-gray-900 flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5 text-gray-400" />
            {warehouseName}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-500">Courier / Carrier:</span>
          <span className="font-semibold text-gray-900">
            {shipment?.carrier || '—'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-500">Tracking Number:</span>
          {shipment?.tracking_number ? (
            <div className="flex items-center gap-1 font-mono font-bold text-blue-700">
              <span>{shipment.tracking_number}</span>
              <button
                type="button"
                onClick={() => handleCopyTracking(shipment.tracking_number!)}
                className="p-1 text-gray-400 hover:text-blue-600 cursor-pointer"
                title="Copy Tracking #"
              >
                {copiedTracking ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ) : (
            <span className="text-gray-400 italic">None generated</span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-500">Shipment Date:</span>
          <span className="text-gray-800">
            {shipment?.ship_date
              ? new Date(shipment.ship_date).toLocaleDateString()
              : '—'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-500">Delivery Date:</span>
          <span className="text-gray-800">
            {shipment?.delivery_date
              ? new Date(shipment.delivery_date).toLocaleDateString()
              : '—'}
          </span>
        </div>

        {/* Payment Summary */}
        <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
          <span className="text-gray-500 flex items-center gap-1">
            <CreditCard className="h-3.5 w-3.5 text-gray-400" />
            Total Amount:
          </span>
          <span className="font-bold text-gray-900 text-sm font-mono">
            {formatCurrency(totalAmount)}
          </span>
        </div>
      </div>
    </div>
  );
}
