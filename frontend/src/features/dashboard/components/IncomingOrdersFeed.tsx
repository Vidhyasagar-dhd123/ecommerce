import { useMemo } from 'react';
import {
  Search,
  Lock,
  Unlock,
  MapPin,
  Clock,
  ChevronRight,
  Filter,
  User,
  Package,
} from 'lucide-react';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { OrderAvailabilityBadge } from './OrderAvailabilityBadge';
import { CustomerDueBadge } from './CustomerDueBadge';
import { CouponUsedBadge } from './CouponUsedBadge';
import { LockStatusBadge } from './LockStatusBadge';
import type { SupportOrder } from '../model/supportTypes';

interface Props {
  orders: SupportOrder[];
  isPending: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusFilterChange: (s: string) => void;
  selectedOrderId: number | null;
  onSelectOrder: (id: number) => void;
  onLockOrder: (id: number) => void;
  onUnlockOrder: (id: number) => void;
  isLocking: boolean;
  currentWarehouseId?: number | null;
  onOpenDueModal: (customerId: number, name?: string) => void;
}

const STATUS_FILTERS = [
  { value: '', label: 'All Orders' },
  { value: 'pending', label: 'Pending Incoming' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function IncomingOrdersFeed({
  orders,
  isPending,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  selectedOrderId,
  onSelectOrder,
  onLockOrder,
  onUnlockOrder,
  isLocking,
  currentWarehouseId,
  onOpenDueModal,
}: Props) {
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter && o.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = String(o.id).includes(q);
        const matchesUser = o.customer_username?.toLowerCase().includes(q);
        const matchesEmail = o.customer_email?.toLowerCase().includes(q);
        const matchesCity = o.address_details?.city?.toLowerCase().includes(q);
        if (!matchesId && !matchesUser && !matchesEmail && !matchesCity) return false;
      }
      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-xs overflow-hidden">
      {/* ── Toolbar & Filter Bar ── */}
      <div className="border-b border-gray-100 p-4 space-y-3 bg-white">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by Order #, customer username, email, city…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 pl-9 pr-4 text-xs font-medium outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-xs font-semibold text-gray-500">
              {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
            </span>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_FILTERS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onStatusFilterChange(tab.value)}
              className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === tab.value
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100/80 text-gray-600 hover:bg-gray-200/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Orders Table / Feed ── */}
      {isPending ? (
        <div className="p-8 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-16 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-300 mb-2" />
          <p className="text-sm font-semibold text-gray-700">No incoming orders found</p>
          <p className="text-xs text-gray-400 mt-1">
            Try adjusting your search criteria or status filter.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/75 text-gray-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Order ID & Date</th>
                <th className="py-3 px-4">Customer & Dues</th>
                <th className="py-3 px-4">Warehouse Stock Status</th>
                <th className="py-3 px-4">Delivery Address</th>
                <th className="py-3 px-4">Coupon</th>
                <th className="py-3 px-4">Amount & Status</th>
                <th className="py-3 px-4">Lock Control</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map((order) => {
                const isSelected = selectedOrderId === order.id;
                const isLocked = order.is_locked;
                const isLockedByMyWarehouse =
                  Boolean(currentWarehouseId && order.locked_by_warehouse === currentWarehouseId);

                return (
                  <tr
                    key={order.id}
                    onClick={() => onSelectOrder(order.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50/60'
                        : 'hover:bg-gray-50/80'
                    }`}
                  >
                    {/* Order ID & Date */}
                    <td className="py-3.5 px-4 font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-gray-900 text-sm">#{order.id}</span>
                        {order.status === 'pending' && (
                          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {new Date(order.order_date).toLocaleDateString()} {new Date(order.order_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* Customer & Dues */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-gray-400" />
                        <span className="font-semibold text-gray-800 truncate max-w-[130px]">
                          {order.customer_username ?? `Customer #${order.customer_id ?? order.customer ?? '—'}`}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <CustomerDueBadge
                          hasDues={order.has_dues}
                          duesAmount={order.dues_amount}
                          onViewDues={() => {
                            if (order.customer_id || order.customer) {
                              onOpenDueModal(
                                order.customer_id ?? (order.customer as number),
                                order.customer_username ?? undefined
                              );
                            }
                          }}
                        />
                      </div>
                    </td>

                    {/* Warehouse Availability Indicator */}
                    <td className="py-3.5 px-4">
                      <OrderAvailabilityBadge availability={order.warehouse_availability} />
                    </td>

                    {/* Delivery Address */}
                    <td className="py-3.5 px-4">
                      {order.address_details ? (
                        <div className="flex items-start gap-1 max-w-[180px]">
                          <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                          <div className="truncate text-gray-600 text-[11px]">
                            <p className="font-medium truncate text-gray-800">
                              {order.address_details.city}, {order.address_details.state}
                            </p>
                            <p className="truncate text-gray-400">
                              {order.address_details.street_address} ({order.address_details.postal_code})
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Coupon */}
                    <td className="py-3.5 px-4">
                      <CouponUsedBadge couponCode={order.coupon_code} />
                    </td>

                    {/* Amount & Status */}
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-gray-900 text-xs">
                        {formatCurrency(order.total_amount)}
                      </p>
                      <span
                        className={`mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          order.status === 'confirmed'
                            ? 'bg-blue-100 text-blue-800'
                            : order.status === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : order.status === 'shipped'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>

                    {/* Lock Status & Control */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <LockStatusBadge
                          isLocked={order.is_locked}
                          lockedByWarehouseName={order.locked_by_warehouse_name}
                          lockedByUsername={order.locked_by_username}
                          currentWarehouseId={currentWarehouseId}
                          orderWarehouseId={order.locked_by_warehouse}
                        />

                        <div>
                          {isLocked ? (
                            order.status === 'pending' ? (
                              <button
                                type="button"
                                disabled={isLocking}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUnlockOrder(order.id);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                                title="Unlock pending order to return to global pool"
                              >
                                <Unlock className="h-3 w-3 text-gray-500" />
                                Release Lock
                              </button>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-400"
                                title="Only pending orders can be released"
                              >
                                <Lock className="h-2.5 w-2.5" /> Bound to Warehouse
                              </span>
                            )
                          ) : order.status === 'pending' ? (
                            <button
                              type="button"
                              disabled={isLocking}
                              onClick={(e) => {
                                e.stopPropagation();
                                onLockOrder(order.id);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
                              title="Lock pending order to your warehouse (hides it from other warehouses)"
                            >
                              <Lock className="h-3 w-3" />
                              Lock Order
                            </button>
                          ) : (
                            <span className="text-[10px] font-medium text-gray-400">
                              Unlocked ({order.status})
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Open Detail Arrow */}
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end text-blue-600 font-semibold text-xs">
                        <span>Details</span>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
