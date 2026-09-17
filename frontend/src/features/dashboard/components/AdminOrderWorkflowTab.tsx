import {
  Package,
  Search,
  CheckCircle2,
  Truck,
  CheckCheck,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import type { SupportOrder } from '../model/supportTypes';

interface AdminOrderWorkflowTabProps {
  orders: SupportOrder[];
  isLoading: boolean;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onUpdateStatus: (orderId: number, status: string) => void;
  onCancelOrder: (orderId: number) => void;
  isActionPending: boolean;
}

export function AdminOrderWorkflowTab({
  orders,
  isLoading,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchChange,
  onUpdateStatus,
  onCancelOrder,
  isActionPending,
}: AdminOrderWorkflowTabProps) {
  const filteredOrders = orders.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const idStr = String(o.id);
    const customer = (o.customer_name || '').toLowerCase();
    return idStr.includes(q) || customer.includes(q);
  });

  return (
    <div className="space-y-4">
      {/* ── Filters & Search ── */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(
            (status) => (
              <button
                key={status}
                onClick={() => onStatusFilterChange(status)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status === 'all' ? 'All Orders' : status}
              </button>
            )
          )}
        </div>

        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search order #, customer..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* ── Orders Table ── */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Workflow Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="p-4">
                      <div className="h-6 animate-pulse rounded-md bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No orders matching criteria
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const statusColors: Record<string, string> = {
                    pending: 'bg-amber-50 text-amber-700 ring-amber-700/10',
                    confirmed: 'bg-blue-50 text-blue-700 ring-blue-700/10',
                    shipped: 'bg-indigo-50 text-indigo-700 ring-indigo-700/10',
                    delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-700/10',
                    cancelled: 'bg-rose-50 text-rose-700 ring-rose-700/10',
                  };
                  const badgeClass =
                    statusColors[order.status.toLowerCase()] ||
                    'bg-slate-100 text-slate-700 ring-slate-700/10';

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        #ORD-{order.id}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">
                          {order.customer_name || 'Anonymous'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          User #{order.customer}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        ${Number(order.total_amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold capitalize ring-1 ring-inset ${badgeClass}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">
                        {order.order_date || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {order.status === 'pending' && (
                            <button
                              onClick={() => onUpdateStatus(order.id, 'confirmed')}
                              disabled={isActionPending}
                              className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-2xs hover:bg-blue-700 disabled:opacity-50"
                              title="Confirm Order"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Confirm
                            </button>
                          )}

                          {order.status === 'confirmed' && (
                            <button
                              onClick={() => onUpdateStatus(order.id, 'shipped')}
                              disabled={isActionPending}
                              className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-2xs hover:bg-indigo-700 disabled:opacity-50"
                              title="Mark as Shipped"
                            >
                              <Truck className="h-3 w-3" />
                              Ship
                            </button>
                          )}

                          {order.status === 'shipped' && (
                            <button
                              onClick={() => onUpdateStatus(order.id, 'delivered')}
                              disabled={isActionPending}
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-50"
                              title="Mark as Delivered"
                            >
                              <CheckCheck className="h-3 w-3" />
                              Deliver
                            </button>
                          )}

                          {order.status !== 'cancelled' && order.status !== 'delivered' && (
                            <button
                              onClick={() => onCancelOrder(order.id)}
                              disabled={isActionPending}
                              className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 shadow-2xs hover:bg-rose-100 disabled:opacity-50"
                              title="Cancel Order"
                            >
                              <XCircle className="h-3 w-3" />
                              Cancel
                            </button>
                          )}

                          <a
                            href={`http://localhost:8000/admin/orders/order/${order.id}/change/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            title="Open in Django Admin"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
