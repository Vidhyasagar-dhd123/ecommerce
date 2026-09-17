import { AlertCircle, Check } from 'lucide-react';
import { formatCurrency } from '@/shared/utils/formatCurrency';

interface Props {
  hasDues?: boolean;
  duesAmount?: string;
  onViewDues?: () => void;
}

export function CustomerDueBadge({ hasDues, duesAmount, onViewDues }: Props) {
  const numericAmount = parseFloat(duesAmount || '0');

  if (hasDues && numericAmount > 0) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onViewDues?.();
        }}
        className="inline-flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2 py-0.5 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors shadow-xs"
        title="Customer has unpaid previous dues. Click to review."
      >
        <AlertCircle className="h-3 w-3 text-red-600 animate-pulse" />
        Due: {formatCurrency(duesAmount || 0)}
      </button>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-lg bg-gray-50 border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-500"
      title="No outstanding dues on record"
    >
      <Check className="h-3 w-3 text-gray-400" />
      No Dues
    </span>
  );
}
