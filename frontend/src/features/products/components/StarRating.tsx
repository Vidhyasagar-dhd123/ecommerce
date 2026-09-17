import { Star } from 'lucide-react';

interface StarRatingProps {
  /** 0–5 value; decimals are rounded for display */
  value: number;
  max?: number;
  size?: 'sm' | 'md';
}

/**
 * Read-only star rating display.
 * For the interactive form picker, use StarInput instead.
 */
export function StarRating({ value, max = 5, size = 'sm' }: StarRatingProps) {
  const dim = size === 'md' ? 'h-5 w-5' : 'h-4 w-4';
  return (
    <div className="flex" aria-label={`${value.toFixed(1)} out of ${max} stars`} role="img">
      {Array.from({ length: max }, (_, i) => i + 1).map((s) => (
        <Star
          key={s}
          className={`${dim} ${s <= Math.round(value) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
        />
      ))}
    </div>
  );
}
