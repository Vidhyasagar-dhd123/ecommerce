import { useMemo, useCallback } from 'react';
import { AlertCircle, Wallet } from 'lucide-react';
import { useDues, useDuesSummary, usePayDue } from '../../orders/hooks/useOrders';
import { formatCurrency } from '@utils/formatCurrency';
import { formatDate, isExpired } from '@utils/formatDate';

interface Due {
  id: number;
  amount: string;
  status: string;
  due_date: string;
  description?: string;
}

export default function DuesPage() {
  const { data: dues, isPending } = useDues();
  const { data: summary } = useDuesSummary();
  const payMutation = usePayDue();

  const pendingDues = useMemo(
    () =>
      (Array.isArray(dues) ? (dues as Due[]) : []).filter(
        (d) => d.status?.toLowerCase() !== 'paid',
      ),
    [dues],
  );

  const overdueDues = useMemo(
    () => pendingDues.filter((d) => d.due_date && isExpired(d.due_date)),
    [pendingDues],
  );

  const handlePay = useCallback(
    (dueId: number) => payMutation.mutate(dueId),
    [payMutation],
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">My Dues</h1>

        {/* Summary card */}
        {summary && (
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-400">Outstanding</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.total_outstanding)}</p>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-400">Overdue</p>
              <p className="text-xl font-bold text-red-600">{summary.overdue_count}</p>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-400">Pending</p>
              <p className="text-xl font-bold text-yellow-600">{summary.pending_count}</p>
            </div>
          </div>
        )}

        {/* Overdue alert */}
        {overdueDues.length > 0 && (
          <div className="mb-5 flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>You have {overdueDues.length} overdue due(s). Please pay to avoid penalties.</p>
          </div>
        )}

        {/* Dues list */}
        {isPending ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-200" />)}
          </div>
        ) : pendingDues.length === 0 ? (
          <div className="py-16 text-center">
            <Wallet className="mx-auto mb-3 h-10 w-10 text-gray-200" />
            <p className="text-gray-400">All dues cleared!</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {pendingDues.map((due) => {
              const overdue = isExpired(due.due_date);
              return (
                <li
                  key={due.id}
                  className={`flex items-center justify-between gap-4 rounded-2xl border bg-white p-5 ${
                    overdue ? 'border-red-200' : 'border-gray-100'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{due.description ?? `Due #${due.id}`}</p>
                    <p className={`mt-0.5 text-xs ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                      Due by {formatDate(due.due_date)} {overdue && '· Overdue'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-base font-bold text-gray-900">{formatCurrency(due.amount)}</p>
                    <button
                      onClick={() => handlePay(due.id)}
                      disabled={payMutation.isPending}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      Pay Now
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
