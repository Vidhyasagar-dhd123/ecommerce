import { useMemo, useCallback, memo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Package, ChevronRight } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { useOrders } from '../hooks/useOrders';
import { orderKeys } from '../hooks/useOrders';
import { fetchOrder } from '../api/ordersApi';
import { usePagination } from '@/shared/hooks/usePagination';
import { formatCurrency } from '@utils/formatCurrency';
import { formatDate } from '@utils/formatDate';
import type { OrderList, OrderStatus } from '../model/types';

const STATUS_TABS: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'returned', label: 'Returned' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  confirmed: 'bg-blue-50 text-blue-700',
  shipped: 'bg-purple-50 text-purple-700',
  delivered: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
  returned: 'bg-gray-100 text-gray-600',
};

// ── Order Card ────────────────────────────────────────────
const OrderCard = memo(function OrderCard({ order }: { order: OrderList }) {
  const queryClient = useQueryClient();

  const handleMouseEnter = useCallback(() => {
    void queryClient.prefetchQuery({
      queryKey: orderKeys.detail(order.id),
      queryFn: () => fetchOrder(order.id),
    });
  }, [order.id, queryClient]);

  return (
    <li onMouseEnter={handleMouseEnter}>
      <Link
        to={`/orders/${order.id}`}
        className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
            <Package className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Order #{order.id}</p>
            <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}
          >
            {order.status}
          </span>
          <p className="text-sm font-bold text-gray-900">{formatCurrency(order.total_amount)}</p>
          <ChevronRight className="h-4 w-4 text-gray-300" />
        </div>
      </Link>
    </li>
  );
});

export default function OrderListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { page, setPage } = usePagination(10);

  const activeStatus = useMemo(
    () => (searchParams.get('status') ?? 'all') as OrderStatus | 'all',
    [searchParams],
  );

  const { data, isPending } = useOrders({
    page,
    status: activeStatus === 'all' ? undefined : activeStatus,
  });

  const handleStatusChange = useCallback(
    (status: OrderStatus | 'all') => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (status === 'all') next.delete('status');
        else next.set('status', status);
        next.delete('page');
        return next;
      }, { replace: true });
    },
    [setSearchParams],
  );

  const filteredOrders = useMemo(() => {
    if (!data?.results) return [];
    if (activeStatus === 'all') return data.results;
    return data.results.filter(
      (order) => order.status?.toLowerCase() === activeStatus.toLowerCase(),
    );
  }, [data?.results, activeStatus]);

  const totalPages = useMemo(() => {
    const count = activeStatus === 'all' ? (data?.count ?? 0) : filteredOrders.length;
    return Math.max(1, Math.ceil(count / 10));
  }, [data?.count, filteredOrders.length, activeStatus]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">My Orders</h1>

        {/* Status tabs */}
        <nav
          role="tablist"
          aria-label="Order status filter"
          className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-sm border"
        >
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              role="tab"
              aria-selected={activeStatus === tab.value}
              onClick={() => handleStatusChange(tab.value)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                activeStatus === tab.value
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Orders */}
        {isPending ? (
          <ul className="space-y-3">
            {[1, 2, 3].map((i) => (
              <li key={i} className="h-16 animate-pulse rounded-2xl bg-gray-200" />
            ))}
          </ul>
        ) : !filteredOrders.length ? (
          <div className="py-20 text-center">
            <Package className="mx-auto mb-3 h-12 w-12 text-gray-200" />
            <p className="text-gray-400">
              {activeStatus === 'all' ? 'No orders found' : `No ${activeStatus} orders found`}
            </p>
            <Link to="/products" className="mt-4 block text-sm text-blue-600 hover:underline">
              Start shopping
            </Link>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {filteredOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </ul>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                <button onClick={() => setPage(page - 1)} disabled={page === 1}
                  className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40 hover:bg-gray-50">Prev</button>
                <span className="flex items-center text-sm text-gray-500">Page {page} of {totalPages}</span>
                <button onClick={() => setPage(page + 1)} disabled={page === totalPages}
                  className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40 hover:bg-gray-50">Next</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
