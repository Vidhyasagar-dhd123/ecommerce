import { useMemo, useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';

import { checkoutSchema, type CheckoutFormValues, type Step } from '../model/schemas';
import { CheckoutStepper } from '../components/CheckoutStepper';
import { AddressStep }     from '../components/AddressStep';
import { PaymentStep }     from '../components/PaymentStep';
import { OrderReview }     from '../components/OrderReview';

import { useCart }                                     from '../../cart/hooks/useCart';
import { useAddresses, useCreateOrder, useCreateAddress } from '../../orders/hooks/useOrders';
import { handleApiError }  from '@utils/apiHelpers';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { state } = useLocation() as { state: { couponCode?: string } | null };
  const couponCode = state?.couponCode ?? '';

  const [step, setStep] = useState<Step>('address');

  const { data: cart } = useCart();
  const { data: addressData, isPending: loadingAddresses } = useAddresses({ page_size: 100 });
  const createOrderMutation   = useCreateOrder();
  const createAddressMutation = useCreateAddress();

  const addresses = useMemo(
    () => (Array.isArray(addressData) ? addressData : addressData?.results ?? []),
    [addressData],
  );

  // ── Main checkout form ────────────────────────────────────
  const { handleSubmit, setValue, watch, formState: { errors }, setError } =
    useForm<CheckoutFormValues>({ resolver: zodResolver(checkoutSchema) });

  const selectedAddressId = watch('address_id');
  const selectedPayment   = watch('payment_method');

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
    () => addresses.find((a) => a.id === selectedAddressId),
    [addresses, selectedAddressId],
  );

  // ── Submit ────────────────────────────────────────────────
  const handlePlaceOrder = useCallback(
    (data: CheckoutFormValues) => {
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

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
          Checkout
        </h1>

        <CheckoutStepper step={step} />

        <form onSubmit={handleSubmit(handlePlaceOrder)} className="space-y-6" noValidate>
          {step === 'address' && (
            <AddressStep
              addresses={addresses}
              loadingAddresses={loadingAddresses}
              selectedAddressId={selectedAddressId}
              setValue={setValue}
              errors={errors}
              createAddressMutation={createAddressMutation}
              onNext={() => setStep('payment')}
            />
          )}

          {step === 'payment' && (
            <PaymentStep
              selectedPayment={selectedPayment}
              setValue={setValue}
              errors={errors}
              onBack={() => setStep('address')}
              onNext={() => setStep('confirm')}
            />
          )}

          {step === 'confirm' && (
            <OrderReview
              selectedAddress={selectedAddress}
              selectedPayment={selectedPayment}
              cartItems={cart?.items ?? []}
              orderTotal={orderTotal}
              isPending={createOrderMutation.isPending}
              onBack={() => setStep('payment')}
            />
          )}
        </form>
      </div>
    </div>
  );
}
