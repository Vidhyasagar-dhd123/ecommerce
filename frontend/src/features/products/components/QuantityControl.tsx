import { Minus, Plus } from 'lucide-react';

interface QuantityControlProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
}

/** +/− quantity stepper with min/max bounds */
export function QuantityControl({ value, min = 1, max = 99, onChange }: QuantityControlProps) {
  return (
    <div className="flex items-center gap-3">
      <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Qty</p>
      <div
        className="flex items-center gap-0 rounded-lg border"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <button
          type="button"
          aria-label="Decrease quantity"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="px-3 py-2 transition-colors duration-100 hover:bg-gray-50 disabled:opacity-40"
        >
          <Minus className="h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} />
        </button>
        <span
          className="min-w-[2rem] text-center text-sm font-semibold"
          aria-live="polite"
          aria-label={`Quantity: ${value}`}
          style={{ color: 'var(--color-text)' }}
        >
          {value}
        </span>
        <button
          type="button"
          aria-label="Increase quantity"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="px-3 py-2 transition-colors duration-100 hover:bg-gray-50 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} />
        </button>
      </div>
    </div>
  );
}
