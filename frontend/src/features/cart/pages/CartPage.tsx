import { useState, useMemo, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Trash2, ShoppingBag, Tag, ArrowRight, X } from 'lucide-react';
import toast from 'react-hot-toast';

import {
  useCart, useUpdateCartItem, useRemoveCartItem, useClearCart,
} from '../hooks/useCart';
import { validateCoupon } from '../api/cartApi';
import { useUIStore } from '@/shared/store/uiStore';
import { formatCurrency } from '@utils/formatCurrency';
import { getApiErrorMessage } from '@utils/apiHelpers';
import { CartItemRow } from '../components/CartItemRow';


// ── Main Page ─────────────────────────────────────────────
export default function CartPage() {
  const navigate = useNavigate();
  const { data: cart, isPending } = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const clearCartMutation = useClearCart();
  const setCartCount = useUIStore((s) => s.setCartCount);

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);

  // Sync cart count to global store
  useEffect(() => {
    setCartCount(cart?.items.length ?? 0);
  }, [cart?.items.length, setCartCount]);

  // Coupon mutation
  const couponMutation = useMutation({
    mutationFn: () => validateCoupon(couponInput),
    onSuccess: (data) => {
      if (data.valid) {
        const discount =
          data.discount_type === 'percent'
            ? (subtotal * parseFloat(data.discount_value)) / 100
            : parseFloat(data.discount_value);
        setCouponDiscount(discount);
        setAppliedCode(data.code);
        toast.success(`Coupon "${data.code}" applied!`);
      } else {
        toast.error(data.message ?? 'Invalid coupon');
      }
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  // ── Derived ───────────────────────────────────────────────
  const subtotal = useMemo(
    () => (cart?.items ?? []).reduce((s, i) => s + Number(i.price) * i.quantity, 0),
    [cart?.items],
  );

  const shipping = useMemo(() => (subtotal > 0 && subtotal < 999 ? 99 : 0), [subtotal]);
  const grandTotal = useMemo(() => subtotal - couponDiscount + shipping, [subtotal, couponDiscount, shipping]);
  const itemCount = useMemo(() => (cart?.items ?? []).reduce((s, i) => s + i.quantity, 0), [cart?.items]);

  // ── Stable callbacks ──────────────────────────────────────
  const handleQuantityChange = useCallback(
    (itemId: number, qty: number) => {
      if (qty < 1) return;
      updateItem.mutate({ itemId, quantity: qty });
    },
    [updateItem],
  );

  const handleRemove = useCallback(
    (itemId: number) => removeItem.mutate(itemId),
    [removeItem],
  );

  const handleApplyCoupon = useCallback(() => {
    if (!couponInput.trim()) return;
    couponMutation.mutate();
  }, [couponInput, couponMutation]);

  const handleRemoveCoupon = useCallback(() => {
    setCouponDiscount(0);
    setAppliedCode(null);
    setCouponInput('');
  }, []);

  // ── Loading ───────────────────────────────────────────────
  if (isPending) {
    return (
      <div className="mx-auto max-w-7xl animate-pulse px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-8 w-1/4 rounded bg-gray-200" />
        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 rounded-2xl border p-4">
              <div className="h-20 w-20 rounded-xl bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-gray-200" />
                <div className="h-3 w-1/2 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Empty cart ────────────────────────────────────────────
  if (!cart?.items.length) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 text-center">
        <ShoppingBag className="h-16 w-16 text-gray-200" />
        <h1 className="text-xl font-bold text-gray-700">Your cart is empty</h1>
        <p className="text-sm text-gray-400">Add some products and come back!</p>
        <Link
          to="/products"
          className="mt-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            Cart <span className="text-base font-normal text-gray-400">({itemCount} items)</span>
          </h1>
          <button
            onClick={() => clearCartMutation.mutate()}
            disabled={clearCartMutation.isPending}
            className="flex items-center gap-1 text-sm text-red-400 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" /> Clear cart
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Items list */}
          <ul className="space-y-4 lg:col-span-2">
            {cart.items.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                onQuantityChange={handleQuantityChange}
                onRemove={handleRemove}
                isUpdating={updateItem.isPending}
              />
            ))}
          </ul>

          {/* Order summary */}
          <aside className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm h-fit">
            <h2 className="mb-5 font-bold text-gray-800">Order Summary</h2>

            {/* Coupon */}
            <div className="mb-5">
              {appliedCode ? (
                <div className="flex items-center justify-between rounded-xl bg-green-50 px-3 py-2 text-sm">
                  <span className="flex items-center gap-1 text-green-700">
                    <Tag className="h-3.5 w-3.5" /> {appliedCode}
                  </span>
                  <button onClick={handleRemoveCoupon} className="text-gray-400 hover:text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    id="coupon-code"
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Coupon code"
                    aria-label="Coupon code"
                    className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponMutation.isPending || !couponInput.trim()}
                    className="rounded-xl bg-gray-800 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
                  >
                    {couponMutation.isPending ? '…' : 'Apply'}
                  </button>
                </div>
              )}
            </div>

            {/* Price breakdown */}
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Coupon discount</span>
                  <span>−{formatCurrency(couponDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>{shipping === 0 ? <span className="text-green-600">Free</span> : formatCurrency(shipping)}</span>
              </div>
              <div className="flex justify-between border-t pt-3 text-base font-bold text-gray-900">
                <span>Total</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            <button
              onClick={() =>
                navigate('/checkout', { state: { couponCode: appliedCode } })
              }
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Proceed to Checkout <ArrowRight className="h-4 w-4" />
            </button>

            <Link
              to="/products"
              className="mt-3 block text-center text-xs text-gray-400 hover:text-gray-600"
            >
              Continue Shopping
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
