import { useMemo, useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, CreditCard, CheckCircle, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

import { useCart } from '../../cart/hooks/useCart';
import { useAddresses, useCreateOrder, useCreateAddress } from '../../orders/hooks/useOrders';
import { handleApiError } from '@utils/apiHelpers';
import { formatCurrency } from '@utils/formatCurrency';

// ── Schemas ───────────────────────────────────────────────
const checkoutSchema = z.object({
  address_id: z.number({ required_error: 'Select a delivery address' }),
  payment_method: z.enum(['cod', 'upi', 'netbanking', 'cash'], {
    required_error: 'Select a payment method',
  }),
});

const addressSchema = z.object({
  name: z.string().min(2, 'Min 2 characters'),
  street: z.string().min(5, 'Enter full street address'),
  city: z.string().min(2),
  state: z.string().min(2),
  country: z.string(),
  zipcode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit PIN'),
  address_type: z.enum(['Shipping', 'Billing', 'Other']),
  landmark: z.string().optional(),
  is_default: z.boolean(),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;
type AddressForm = z.infer<typeof addressSchema>;

const PAYMENT_METHODS = [
  { value: 'cod', label: 'Cash on Delivery' },
  { value: 'upi', label: 'UPI' },
  { value: 'netbanking', label: 'Net Banking' },
  { value: 'cash', label: 'Cash' },
] as const;

type Step = 'address' | 'payment' | 'confirm';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { state } = useLocation() as { state: { couponCode?: string } | null };
  const couponCode = state?.couponCode ?? '';

  const [step, setStep] = useState<Step>('address');
  const [showAddressForm, setShowAddressForm] = useState(false);

  const { data: cart } = useCart();
  const { data: addressData, isPending: loadingAddresses } = useAddresses({ page_size: 100 });
  const createOrderMutation = useCreateOrder();
  const createAddressMutation = useCreateAddress();

  const addresses = useMemo(
    () => (Array.isArray(addressData) ? addressData : addressData?.results ?? []),
    [addressData],
  );

  // ── Main checkout form ────────────────────────────────────
  const {
    handleSubmit, setValue, watch,
    formState: { errors },
    setError,
  } = useForm<CheckoutForm>({ resolver: zodResolver(checkoutSchema) });

  const selectedAddressId = watch('address_id');
  const selectedPayment = watch('payment_method');

  // ── Address form ──────────────────────────────────────────
  const addrForm = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: { country: 'India', address_type: 'Shipping', is_default: false },
  });

  // Auto-select default address
  const defaultAddress = useMemo(
    () => addresses.find((a) => a.is_default && a.address_type === 'Shipping') ?? addresses[0],
    [addresses],
  );

  useEffect(() => {
    if (defaultAddress && !selectedAddressId) {
      setValue('address_id', defaultAddress.id);
    }
  }, [defaultAddress, selectedAddressId, setValue]);

  // ── Derived ───────────────────────────────────────────────
  const orderTotal = useMemo(
    () => (cart?.items ?? []).reduce((s, i) => s + Number(i.price) * i.quantity, 0),
    [cart?.items],
  );

  const selectedAddress = useMemo(
    () => addresses?.find((a) => a.id === selectedAddressId),
    [addresses, selectedAddressId],
  );

  // ── Handlers ──────────────────────────────────────────────
  const handlePlaceOrder = useCallback(
    (data: CheckoutForm) => {
      createOrderMutation.mutate(
        { address_id: data.address_id, payment_method: data.payment_method, coupon_code: couponCode || undefined },
        {
          onSuccess: (order) => {
            toast.success('Order placed successfully!');
            navigate(`/orders/${order.id}`, { replace: true });
          },
          onError: (err) => handleApiError(err, setError, (msg) => toast.error(msg)),
        },
      );
    },
    [createOrderMutation, couponCode, navigate, setError],
  );

  const handleAddAddress = useCallback(
    (data: AddressForm) => {
      createAddressMutation.mutate(data as Parameters<typeof createAddressMutation.mutate>[0], {
        onSuccess: (addr) => {
          setValue('address_id', addr.id);
          setShowAddressForm(false);
          addrForm.reset();
        },
        onError: (err) => handleApiError(err, addrForm.setError, (msg) => toast.error(msg)),
      });
    },
    [createAddressMutation, setValue, addrForm],
  );

  const steps: Step[] = ['address', 'payment', 'confirm'];
  const stepIndex = steps.indexOf(step);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-2xl font-bold text-gray-900">Checkout</h1>

        {/* Stepper */}
        <div className="mb-10 flex items-center gap-2">
          {steps.map((s, idx) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition ${
                  idx <= stepIndex ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
                }`}
              >
                {idx < stepIndex ? <CheckCircle className="h-4 w-4" /> : idx + 1}
              </div>
              <span className={`text-xs font-medium capitalize ${idx <= stepIndex ? 'text-blue-600' : 'text-gray-400'}`}>
                {s}
              </span>
              {idx < steps.length - 1 && <div className="h-px w-8 bg-gray-200" />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(handlePlaceOrder)} className="space-y-6" noValidate>
          {/* ── Step 1: Address ── */}
          {step === 'address' && (
            <div className="rounded-2xl border bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-bold text-gray-800">
                  <MapPin className="h-5 w-5 text-blue-600" /> Delivery Address
                </h2>
                <button type="button" onClick={() => setShowAddressForm((v) => !v)}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                  <Plus className="h-4 w-4" /> Add new
                </button>
              </div>

              {/* Address form */}
              {showAddressForm && (
                <div className="mb-5 rounded-xl border border-dashed border-blue-200 bg-blue-50 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-blue-700">New Address</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {([ ['name','Name'], ['street','Street'], ['city','City'], ['state','State'], ['zipcode','PIN Code'], ['landmark','Landmark (optional)'] ] as const).map(([field, label]) => (
                      <div key={field}>
                        <label htmlFor={`addr-${field}`} className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
                        <input
                          id={`addr-${field}`}
                          {...addrForm.register(field)}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        />
                        {addrForm.formState.errors[field] && (
                          <p className="mt-0.5 text-xs text-red-500">{addrForm.formState.errors[field]?.message}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={addrForm.handleSubmit(handleAddAddress)}
                      disabled={createAddressMutation.isPending}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                      {createAddressMutation.isPending ? 'Saving…' : 'Save Address'}
                    </button>
                    <button type="button" onClick={() => setShowAddressForm(false)}
                      className="rounded-lg border px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Address selection */}
              {loadingAddresses ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-16 rounded-xl bg-gray-100" />
                  <div className="h-16 rounded-xl bg-gray-100" />
                </div>
              ) : (
                <div className="space-y-3" role="radiogroup" aria-label="Delivery address">
                  {addresses?.map((addr) => (
                    <label
                      key={addr.id}
                      className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${
                        selectedAddressId === addr.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        role="radio"
                        aria-checked={selectedAddressId === addr.id}
                        className="mt-1 accent-blue-600"
                        checked={selectedAddressId === addr.id}
                        onChange={() => setValue('address_id', addr.id, { shouldValidate: true })}
                      />
                      <div className="text-sm">
                        <p className="font-semibold text-gray-800">{addr.name}</p>
                        <p className="text-gray-500">{addr.street}, {addr.city} — {addr.zipcode}</p>
                        <p className="text-gray-400">{addr.state}, {addr.country}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {errors.address_id && (
                <p className="mt-2 text-xs text-red-500">{errors.address_id.message}</p>
              )}

              <button
                type="button"
                onClick={() => { if (selectedAddressId) setStep('payment'); else toast.error('Select an address'); }}
                className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Continue to Payment
              </button>
            </div>
          )}

          {/* ── Step 2: Payment ── */}
          {step === 'payment' && (
            <div className="rounded-2xl border bg-white p-6">
              <h2 className="mb-4 flex items-center gap-2 font-bold text-gray-800">
                <CreditCard className="h-5 w-5 text-blue-600" /> Payment Method
              </h2>

              <div className="space-y-3" role="radiogroup" aria-label="Payment method">
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                      selectedPayment === method.value ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      role="radio"
                      aria-checked={selectedPayment === method.value}
                      className="accent-blue-600"
                      checked={selectedPayment === method.value}
                      onChange={() => setValue('payment_method', method.value, { shouldValidate: true })}
                    />
                    <span className="text-sm font-medium text-gray-800">{method.label}</span>
                  </label>
                ))}
              </div>

              {errors.payment_method && (
                <p className="mt-2 text-xs text-red-500">{errors.payment_method.message}</p>
              )}

              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setStep('address')}
                  className="flex-1 rounded-xl border py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => { if (selectedPayment) setStep('confirm'); else toast.error('Select payment method'); }}
                  className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Review Order
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Confirm ── */}
          {step === 'confirm' && (
            <div className="space-y-4">
              {/* Summary card */}
              <div className="rounded-2xl border bg-white p-6">
                <h2 className="mb-4 font-bold text-gray-800">Order Review</h2>

                {selectedAddress && (
                  <div className="mb-4 rounded-xl bg-gray-50 p-3 text-sm">
                    <p className="font-semibold text-gray-700">Delivering to</p>
                    <p className="text-gray-500">{selectedAddress.name} — {selectedAddress.street}, {selectedAddress.city}</p>
                  </div>
                )}

                <div className="mb-4 rounded-xl bg-gray-50 p-3 text-sm">
                  <p className="font-semibold text-gray-700">Payment</p>
                  <p className="text-gray-500 capitalize">{selectedPayment?.replace('_', ' ')}</p>
                </div>

                {/* Items */}
                <ul className="mb-4 space-y-2">
                  {cart?.items.map((i) => (
                    <li key={i.id} className="flex justify-between text-sm">
                      <span className="text-gray-700">{i.variant_details?.product?.name ?? (i.variant_details as { sku?: string })?.sku ?? 'Item'} × {i.quantity}</span>
                      <span className="font-medium">{formatCurrency(Number(i.price) * i.quantity)}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex justify-between border-t pt-3 text-base font-bold text-gray-900">
                  <span>Total</span>
                  <span>{formatCurrency(orderTotal)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep('payment')}
                  className="flex-1 rounded-xl border py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Back
                </button>
                <button
                  type="submit"
                  disabled={createOrderMutation.isPending}
                  className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {createOrderMutation.isPending ? 'Placing Order…' : 'Place Order'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
