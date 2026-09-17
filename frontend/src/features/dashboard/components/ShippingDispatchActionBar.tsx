import {
  Clock,
  Truck,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import type { ShippingOrder } from '../model/shippingTypes';

interface Props {
  order: ShippingOrder;
  isUpdatingStatus: boolean;
  onOpenDispatchModal: (order: ShippingOrder) => void;
  onUpdateStatus: (id: number, status: 'shipped' | 'delivered' | 'returned') => void;
  className?: string;
}

export function ShippingDispatchActionBar({
  order,
  isUpdatingStatus,
  onOpenDispatchModal,
  onUpdateStatus,
  className = '',
}: Props) {
  const shipment = order.shipment;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ── Status Progression Stepper ── */}
      <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Fulfillment Lifecycle
        </div>
        <div className="grid grid-cols-3 gap-2">
          {/* Step 1: Confirmed */}
          <div
            className={`rounded-lg p-3 border text-center transition-all ${
              order.status === 'confirmed'
                ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400/20 text-amber-900 font-bold'
                : ['shipped', 'delivered', 'returned'].includes(order.status)
                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800'
                : 'bg-white border-gray-200 text-gray-400'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 text-xs">
              <Clock className="h-3.5 w-3.5" />
              <span>1. Agent Confirmed</span>
            </div>
            <div className="text-[10px] mt-1 opacity-80">Ready for packing</div>
          </div>

          {/* Step 2: Shipped */}
          <div
            className={`rounded-lg p-3 border text-center transition-all ${
              order.status === 'shipped'
                ? 'bg-indigo-50/90 border-indigo-300 ring-2 ring-indigo-400/20 text-indigo-900 font-bold'
                : ['delivered', 'returned'].includes(order.status)
                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800'
                : 'bg-white border-gray-200 text-gray-400'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 text-xs">
              <Truck className="h-3.5 w-3.5" />
              <span>2. Shipped / In Transit</span>
            </div>
            <div className="text-[10px] mt-1 opacity-80">
              {shipment?.carrier ? `${shipment.carrier}` : 'Dispatched'}
            </div>
          </div>

          {/* Step 3: Delivered or Returned */}
          <div
            className={`rounded-lg p-3 border text-center transition-all ${
              order.status === 'delivered'
                ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-500/20 text-emerald-900 font-bold'
                : order.status === 'returned'
                ? 'bg-rose-50/90 border-rose-400 ring-2 ring-rose-500/20 text-rose-900 font-bold'
                : 'bg-white border-gray-200 text-gray-400'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 text-xs">
              {order.status === 'returned' ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5 text-rose-600" />
                  <span className="text-rose-900">3. Returned</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>3. Delivered</span>
                </>
              )}
            </div>
            <div className="text-[10px] mt-1 opacity-80">
              {order.status === 'delivered'
                ? 'Customer received parcel'
                : order.status === 'returned'
                ? 'Restocked to warehouse'
                : 'Final destination milestone'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Executive Fulfillment Action Bar ── */}
      <div className="rounded-xl border border-gray-200 bg-slate-50 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>
            Order authorized for shipment by Support Agent. You may update status or dispatch.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {/* Action 1: Ship / Dispatch */}
          {order.status === 'confirmed' && (
            <button
              type="button"
              disabled={isUpdatingStatus}
              onClick={() => onOpenDispatchModal(order)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
            >
              <Truck className="h-4 w-4" />
              <span>Dispatch & Ship Order</span>
            </button>
          )}

          {/* Action 2: Mark Delivered */}
          {order.status === 'shipped' && (
            <button
              type="button"
              disabled={isUpdatingStatus}
              onClick={() => onUpdateStatus(order.id, 'delivered')}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Confirm Delivery</span>
            </button>
          )}

          {/* Action 3: Mark Returned */}
          {['shipped', 'delivered'].includes(order.status) && (
            <button
              type="button"
              disabled={isUpdatingStatus}
              onClick={() => onUpdateStatus(order.id, 'returned')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 hover:border-rose-300 active:scale-95 transition-all cursor-pointer"
            >
              <RotateCcw className="h-4 w-4 text-rose-600" />
              <span>Mark as Returned</span>
            </button>
          )}

          {/* If already delivered or returned, allow status correction */}
          {order.status === 'returned' && (
            <button
              type="button"
              disabled={isUpdatingStatus}
              onClick={() => onUpdateStatus(order.id, 'shipped')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-all cursor-pointer"
            >
              <Truck className="h-4 w-4 text-indigo-600" />
              <span>Re-dispatch (Shipped)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
