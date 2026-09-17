import { Search, MapPin, User, Package, Clock, Truck, CheckCircle2, RotateCcw, ChevronRight, Phone, Printer } from 'lucide-react';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import type { ShippingOrder, ShippingStatusFilter } from '../model/shippingTypes';

interface Props {
  orders: ShippingOrder[];
  isPending: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: ShippingStatusFilter;
  onStatusFilterChange: (s: ShippingStatusFilter) => void;
  selectedOrderId: number | null;
  onSelectOrder: (id: number) => void;
  onOpenDispatchModal: (order: ShippingOrder) => void;
  onOpenLabelModal: (order: ShippingOrder) => void;
  onUpdateStatus: (id: number, status: 'shipped' | 'delivered' | 'returned') => void;
  isUpdatingStatus: boolean;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeCls: string; icon: any }
> = {
  confirmed: {
    label: 'Ready to Ship',
    badgeCls: 'bg-amber-50 text-amber-800 border-amber-200/80',
    icon: Clock,
  },
  shipped: {
    label: 'In Transit',
    badgeCls: 'bg-indigo-50 text-indigo-800 border-indigo-200/80',
    icon: Truck,
  },
  delivered: {
    label: 'Delivered',
    badgeCls: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    icon: CheckCircle2,
  },
  returned: {
    label: 'Returned',
    badgeCls: 'bg-rose-50 text-rose-800 border-rose-200/80',
    icon: RotateCcw,
  },
  pending: {
    label: 'Pending Lock',
    badgeCls: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: Clock,
  },
  cancelled: {
    label: 'Cancelled',
    badgeCls: 'bg-gray-100 text-gray-600 border-gray-200 line-through',
    icon: Clock,
  },
};

export function ShippingOrdersFeed({
  orders,
  isPending,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  selectedOrderId,
  onSelectOrder,
  onOpenDispatchModal,
  onOpenLabelModal,
  onUpdateStatus,
  isUpdatingStatus,
}: Props) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-xs overflow-hidden">
      {/* ── Toolbar: Search & Filter Tabs ── */}
      <div className="border-b border-gray-100 p-4 space-y-3 bg-white">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by Order #, customer username, recipient city, tracking…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 pl-9 pr-4 text-xs font-medium outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Quick Filter Pill Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
            {(
              [
                { key: '', label: 'All Orders' },
                { key: 'confirmed', label: 'Ready to Ship' },
                { key: 'shipped', label: 'In Transit' },
                { key: 'delivered', label: 'Delivered' },
                { key: 'returned', label: 'Returned' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => onStatusFilterChange(tab.key)}
                className={`rounded-lg px-3 py-1.5 font-medium whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === tab.key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Orders Table / List ── */}
      {isPending ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-3" />
          <p className="text-xs text-gray-500 font-medium">Loading warehouse orders…</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500">
          <Package className="h-10 w-10 text-gray-300 mb-2" />
          <p className="text-sm font-semibold text-gray-700">No matching orders found</p>
          <p className="text-xs text-gray-400 mt-1 max-w-sm">
            Only orders locked by a Support Agent of your warehouse and matching current filters will appear here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {orders.map((order) => {
            const isSelected = selectedOrderId === order.id;
            const statusInfo = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const StatusIcon = statusInfo.icon;
            const address = order.address_details;

            return (
              <div
                key={order.id}
                onClick={() => onSelectOrder(order.id)}
                className={`group flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/50 border-l-4 border-l-blue-600 pl-3'
                    : 'hover:bg-slate-50/70'
                }`}
              >
                {/* ── Col 1: Order ID, Support Agent Lock & Date ── */}
                <div className="min-w-[200px] space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm">
                      #{order.id}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${statusInfo.badgeCls}`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {statusInfo.label}
                    </span>
                  </div>

                  <div className="text-[11px] text-gray-500 flex items-center gap-2">
                    <span>{new Date(order.order_date).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{new Date(order.order_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  {order.locked_by_username && (
                    <div className="text-[10px] text-purple-700 font-medium bg-purple-50 px-2 py-0.5 rounded-md inline-flex items-center gap-1 border border-purple-200/60">
                      <span>Agent:</span>
                      <strong className="font-semibold">{order.locked_by_username}</strong>
                    </div>
                  )}
                </div>

                {/* ── Col 2: Customer & Delivery Address ── */}
                <div className="flex-1 min-w-[240px] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                    <User className="h-3.5 w-3.5 text-gray-400" />
                    <span>{address?.title || order.customer_username || 'Recipient'}</span>
                    <span className="text-[11px] text-gray-400 font-normal">
                      (@{order.customer_username})
                    </span>
                  </div>

                  {address && (
                    <div className="flex items-start gap-1 text-[11px] text-gray-600 leading-tight">
                      <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">
                        {address.street_address}, {address.city}, {address.state} - {address.postal_code}
                      </span>
                    </div>
                  )}

                  {address?.phone_number && (
                    <div className="flex items-center gap-1 text-[11px] text-gray-500 font-mono">
                      <Phone className="h-3 w-3 text-gray-400" />
                      <span>{address.phone_number}</span>
                    </div>
                  )}
                </div>

                {/* ── Col 3: Items, Tracking & Amount ── */}
                <div className="min-w-[160px] text-left lg:text-right space-y-1">
                  <div className="text-xs font-bold text-gray-900">
                    {formatCurrency(order.total_amount)}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {order.items_count || 1} {order.items_count === 1 ? 'item' : 'items'}
                  </div>

                  {order.shipment?.tracking_number && (
                    <div className="text-[10px] text-indigo-700 font-medium bg-indigo-50 px-2 py-0.5 rounded-md inline-block font-mono border border-indigo-200/50">
                      {order.shipment.carrier}: {order.shipment.tracking_number}
                    </div>
                  )}
                </div>

                {/* ── Col 4: Quick Status Action Buttons ── */}
                <div
                  className="flex items-center gap-1.5 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Confirmed -> Ship Order button */}
                  {order.status === 'confirmed' && (
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => onOpenDispatchModal(order)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
                    >
                      <Truck className="h-3.5 w-3.5" />
                      <span>Ship Order</span>
                    </button>
                  )}

                  {/* Shipped -> Mark Delivered button */}
                  {order.status === 'shipped' && (
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => onUpdateStatus(order.id, 'delivered')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Mark Delivered</span>
                    </button>
                  )}

                  {/* Shipped -> Mark Returned button */}
                  {order.status === 'shipped' && (
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => onUpdateStatus(order.id, 'returned')}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-all cursor-pointer"
                      title="Mark as Returned / Delivery Failed"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Return</span>
                    </button>
                  )}

                  {/* Print Label Shortcut */}
                  <button
                    type="button"
                    onClick={() => onOpenLabelModal(order)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all cursor-pointer"
                    title="Print Packing Slip / Shipping Label"
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </button>

                  <ChevronRight
                    className={`h-4 w-4 text-gray-400 transition-transform ${
                      isSelected ? 'rotate-90 text-blue-600' : 'group-hover:translate-x-0.5'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
