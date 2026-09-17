import { Minus, Plus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@utils/formatCurrency';
import type { CartItem } from '../model/types';

interface CartItemRowProps {
  item: CartItem;
  onQuantityChange: (id: number, qty: number) => void;
  onRemove: (id: number) => void;
  isUpdating: boolean;
}

/** Single cart item row — product image, name, variant info, quantity stepper, price */
export function CartItemRow({ item, onQuantityChange, onRemove, isUpdating }: CartItemRowProps) {
  const image =
    item.variant_details.product.images.find((i) => i.is_primary) ??
    item.variant_details.product.images[0];

  return (
    <li
      className="flex gap-4 rounded-2xl border p-4"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
    >
      {/* Thumbnail */}
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl" style={{ background: 'var(--color-surface-raised)' }}>
        {image ? (
          <img
            src={image.image_url}
            alt={item.variant_details.product.name}
            width={80}
            height={80}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full" style={{ background: 'var(--color-surface-raised)' }} />
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link
              to={`/products/${item.variant_details.product.slug}`}
              className="text-sm font-semibold transition-colors duration-100"
              style={{ color: 'var(--color-text)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
            >
              {item.variant_details.product.name}
            </Link>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {item.variant_details.color} / {item.variant_details.size}
            </p>
          </div>
          <button
            onClick={() => onRemove(item.id)}
            aria-label={`Remove ${item.variant_details.product.name} from cart`}
            className="transition-colors duration-100"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          {/* Quantity stepper */}
          <div className="flex items-center gap-0 rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
            <button
              aria-label="Decrease quantity"
              onClick={() => onQuantityChange(item.id, item.quantity - 1)}
              disabled={item.quantity <= 1 || isUpdating}
              className="px-2.5 py-1.5 transition-colors duration-100 hover:bg-gray-50 disabled:opacity-40"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <Minus className="h-3 w-3" />
            </button>
            <span
              className="min-w-[1.5rem] text-center text-sm font-semibold"
              style={{ color: 'var(--color-text)' }}
            >
              {item.quantity}
            </span>
            <button
              aria-label="Increase quantity"
              onClick={() => onQuantityChange(item.id, item.quantity + 1)}
              disabled={item.quantity >= item.variant_details.stock || isUpdating}
              className="px-2.5 py-1.5 transition-colors duration-100 hover:bg-gray-50 disabled:opacity-40"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <p className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>
            {formatCurrency(Number(item.price) * item.quantity)}
          </p>
        </div>
      </div>
    </li>
  );
}
