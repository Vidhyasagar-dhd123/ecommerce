import type { ProductVariant } from '../model/types';

interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

/** Pill-style variant selector (colour / size combos) */
export function VariantSelector({ variants, selectedId, onSelect }: VariantSelectorProps) {
  if (!variants.length) return null;

  const allOutOfStock = variants.every((v) => !v.is_in_stock);

  return (
    <div>
      <p className="mb-2 text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
        Select Variant
      </p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Product variants">
        {variants.map((v) => {
          const isSelected = selectedId === v.id;
          const inStock    = v.is_in_stock;
          return (
            <button
              key={v.id}
              role="radio"
              aria-checked={isSelected}
              onClick={() => inStock && onSelect(v.id)}
              disabled={!inStock}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-150"
              style={{
                borderColor:     isSelected ? 'var(--color-primary)' : inStock ? 'var(--color-border)' : '#e5e7eb',
                background:      isSelected ? 'var(--color-primary)' : 'transparent',
                color:           isSelected ? '#fff' : inStock ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
                textDecoration:  inStock ? 'none' : 'line-through',
                cursor:          inStock ? 'pointer' : 'not-allowed',
              }}
            >
              {v.color} / {v.size}
            </button>
          );
        })}
      </div>
      {allOutOfStock && (
        <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--color-danger)' }}>
          Out of Stock
        </p>
      )}
    </div>
  );
}
