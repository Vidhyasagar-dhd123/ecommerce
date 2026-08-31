import { useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { useOrders } from '../../orders/hooks/useOrders';
import { usePagination } from '@/shared/hooks/usePagination';
import { useSearchParams } from 'react-router-dom';
import { formatCurrency } from '@utils/formatCurrency';
import { formatDate } from '@utils/formatDate';
import type { Payment } from '../../orders/model/types';

type Tab = 'orders' | 'payments';

export default function HistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as Tab) ?? 'orders';
  const { page, setPage } = usePagination(15);

  const { data, isPending } = useOrders({ page });

  // Derive payment history from orders (no separate endpoint)
  const orderHistory = useMemo(() => data?.results ?? [], [data]);

  const paymentHistory = useMemo<Payment[]>(() => [], []);

  const handleTabSwitch = useCallback(
    (t: Tab) => {
      setSearchParams({ tab: t }, { replace: true });
    },
    [setSearchParams],
  );

  const totalPages = useMemo(() => Math.ceil((data?.count ?? 0) / 15), [data?.count]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">History</h1>

        {/* Tabs */}
        <div className="mb-6 flex rounded-xl border bg-white p-1 shadow-sm">
          {(['orders', 'payments'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => handleTabSwitch(t)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium capitalize transition ${
                tab === t ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {isPending ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-200" />)}
          </div>
        ) : tab === 'orders' ? (
          <>
            {orderHistory.length === 0 ? (
              <div className="py-16 text-center">
                <Package className="mx-auto mb-2 h-10 w-10 text-gray-200" />
                <p className="text-gray-400">No order history</p>
              </div>
            ) : (
              <ul className="divide-y rounded-2xl border bg-white shadow-sm">
                {orderHistory.map((order) => (
                  <li key={order.id}>
                    <Link to={`/orders/${order.id}`}
                      className="flex items-center justify-between px-5 py-4 hover:bg-gray-50">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Order #{order.id}</p>
                        <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(order.total_amount)}</p>
                        <span className="text-xs text-gray-400 capitalize">{order.status}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            {paymentHistory.length === 0 ? (
              <div className="py-16 text-center text-gray-400">No payment history</div>
            ) : (
              <ul className="divide-y rounded-2xl border bg-white shadow-sm">
                {paymentHistory.map((payment) => (
                  <li key={payment!.id} className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-800 uppercase">
                        {payment!.payment_method}
                      </p>
                      <p className="text-xs text-gray-400">
                        {payment!.paid_at ? formatDate(payment!.paid_at) : 'Pending'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(payment!.amount)}</p>
                      <span
                        className={`text-xs font-medium capitalize ${
                          payment!.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                        }`}
                      >
                        {payment!.payment_status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            <button onClick={() => setPage(page - 1)} disabled={page === 1}
              className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40 hover:bg-gray-50">Prev</button>
            <span className="flex items-center text-sm text-gray-500">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(page + 1)} disabled={page === totalPages}
              className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40 hover:bg-gray-50">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
