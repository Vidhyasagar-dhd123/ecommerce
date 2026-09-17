import { formatCurrency } from '@/shared/utils/formatCurrency';
import { CustomerDueBadge } from './CustomerDueBadge';
import type { CustomerDuesSummary } from '../model/supportTypes';

interface Props {
  customerId: number;
  username?: string | null;
  email?: string | null;
  hasDues?: boolean;
  duesAmount?: string | null;
  duesSummary?: CustomerDuesSummary;
  className?: string;
}

export function OrderCustomerProfileCard({
  customerId,
  username,
  email,
  hasDues,
  duesAmount,
  duesSummary,
  className = '',
}: Props) {
  const isDuesPending = Boolean(
    hasDues || (duesSummary && parseFloat(duesSummary.total_dues) > 0)
  );

  return (
    <div className={`rounded-xl border border-gray-100 bg-gray-50/50 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Customer Information
        </span>
        <CustomerDueBadge
          hasDues={isDuesPending}
          duesAmount={duesAmount ?? duesSummary?.total_dues}
        />
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-400">Username:</span>
          <span className="font-semibold text-gray-900">{username ?? '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Email:</span>
          <span className="font-medium text-gray-800">{email ?? '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Customer ID:</span>
          <span className="font-mono text-gray-600">#{customerId}</span>
        </div>

        {duesSummary && (
          <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center text-xs">
            <span className="text-gray-500 font-medium">Total Outstanding Dues:</span>
            <span className="font-bold text-red-600 font-mono">
              {formatCurrency(duesSummary.total_dues)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
