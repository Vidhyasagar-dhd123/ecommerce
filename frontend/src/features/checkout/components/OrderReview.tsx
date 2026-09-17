import { formatCurrency } from '@utils/formatCurrency';
import type { Address } from '../../orders/model/types';
import type { CartItem } from '../../cart/model/types';

interface OrderReviewProps {
  selectedAddress: Address | undefined;
  selectedPayment: string | undefined;
  cartItems: CartItem[];
  orderTotal: number;
  isPending: boolean;
  onBack: () => void;
}

/** Final confirmation step — shows address, payment, item list, total */
export function OrderReview({
  selectedAddress, selectedPayment, cartItems, orderTotal, isPending, onBack,
}: OrderReviewProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
        <h2 className="mb-4 font-bold" style={{ color: 'var(--color-text)' }}>Order Review</h2>

        {selectedAddress && (
          <div className="mb-4 rounded-xl p-3 text-sm" style={{ background: 'var(--color-surface-raised)' }}>
            <p className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Delivering to</p>
            <p style={{ color: 'var(--color-text-muted)' }}>
              {selectedAddress.name} — {selectedAddress.street}, {selectedAddress.city}
            </p>
          </div>
        )}

        <div className="mb-4 rounded-xl p-3 text-sm" style={{ background: 'var(--color-surface-raised)' }}>
          <p className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Payment</p>
          <p className="capitalize" style={{ color: 'var(--color-text-muted)' }}>
            {selectedPayment?.replace('_', ' ')}
          </p>
        </div>

        {/* Items */}
        <ul className="mb-4 space-y-2">
          {cartItems.map((i) => (
            <li key={i.id} className="flex justify-between text-sm">
              <span style={{ color: 'var(--color-text-secondary)' }}>
                {i.variant_details?.product?.name ?? 'Item'} × {i.quantity}
              </span>
              <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                {formatCurrency(Number(i.price) * i.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <div
          className="flex justify-between border-t pt-3 text-base font-bold"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
        >
          <span>Total</span>
          <span style={{ color: 'var(--color-primary)' }}>{formatCurrency(orderTotal)}</span>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-xl border py-3 text-sm font-medium"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          Back
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--color-primary)' }}
        >
          {isPending ? 'Placing Order…' : 'Place Order'}
        </button>
      </div>
    </div>
  );
}
