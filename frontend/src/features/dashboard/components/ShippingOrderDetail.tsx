import {
  X,
  Package,
  Printer,
} from 'lucide-react';
import { OrderDeliveryAddressCard } from './OrderDeliveryAddressCard';
import { ShipmentTrackingCard } from './ShipmentTrackingCard';
import { ShippingManifestItemsList } from './ShippingManifestItemsList';
import { ShippingDispatchActionBar } from './ShippingDispatchActionBar';
import type { ShippingOrder } from '../model/shippingTypes';

interface Props {
  order: ShippingOrder | null;
  isLoading: boolean;
  onClose: () => void;
  onOpenDispatchModal: (order: ShippingOrder) => void;
  onOpenLabelModal: (order: ShippingOrder) => void;
  onUpdateStatus: (id: number, status: 'shipped' | 'delivered' | 'returned') => void;
  isUpdatingStatus: boolean;
}

export function ShippingOrderDetail({
  order,
  isLoading,
  onClose,
  onOpenDispatchModal,
  onOpenLabelModal,
  onUpdateStatus,
  isUpdatingStatus,
}: Props) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm flex flex-col items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-3" />
        <p className="text-xs text-gray-500 font-medium">Fetching order shipping details…</p>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="rounded-2xl border border-blue-200 bg-white shadow-md overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
      {/* ── Detail Header ── */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-slate-50/80 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900">
                Order Manifest #{order.id}
              </h2>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                {order.status.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
              <span>Placed: {new Date(order.order_date).toLocaleString()}</span>
              {order.locked_by_username && (
                <>
                  <span>•</span>
                  <span className="text-purple-700 font-medium">
                    Locked by Agent: <strong>{order.locked_by_username}</strong>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Print Label Button */}
          <button
            type="button"
            onClick={() => onOpenLabelModal(order)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition-all cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 text-gray-500" />
            <span>Packing Slip & Label</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all cursor-pointer"
            title="Close panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* ── Two-Column Grid: Recipient Info & Shipping/Carrier Info ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <OrderDeliveryAddressCard
            address={order.address_details}
            allowCopyPhone={true}
          />
          <ShipmentTrackingCard
            shipment={order.shipment}
            warehouseName={order.locked_by_warehouse_name}
            totalAmount={order.total_amount}
          />
        </div>

        {/* ── Products & Package Manifest ── */}
        <ShippingManifestItemsList
          items={order.items || []}
        />

        {/* ── Status Progression Stepper & Fulfillment Actions ── */}
        <ShippingDispatchActionBar
          order={order}
          isUpdatingStatus={isUpdatingStatus}
          onOpenDispatchModal={onOpenDispatchModal}
          onUpdateStatus={onUpdateStatus}
        />
      </div>
    </div>
  );
}
