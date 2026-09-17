import { Tag } from 'lucide-react';

interface Props {
  couponCode?: string | null;
}

export function CouponUsedBadge({ couponCode }: Props) {
  if (!couponCode || !couponCode.trim()) {
    return (
      <span className="text-xs text-gray-400 font-medium">
        —
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs font-bold text-indigo-700 tracking-wide"
      title={`Promotional coupon '${couponCode}' applied`}
    >
      <Tag className="h-3 w-3 text-indigo-600" />
      {couponCode.toUpperCase()}
    </span>
  );
}
