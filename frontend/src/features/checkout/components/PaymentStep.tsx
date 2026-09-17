import { CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import type { UseFormSetValue } from 'react-hook-form';

import { PAYMENT_METHODS, type CheckoutFormValues } from '../model/schemas';

interface PaymentStepProps {
  selectedPayment: string | undefined;
  setValue: UseFormSetValue<CheckoutFormValues>;
  errors: { payment_method?: { message?: string } };
  onBack: () => void;
  onNext: () => void;
}

export function PaymentStep({ selectedPayment, setValue, errors, onBack, onNext }: PaymentStepProps) {
  return (
    <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
      <h2 className="mb-4 flex items-center gap-2 font-bold" style={{ color: 'var(--color-text)' }}>
        <CreditCard className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
        Payment Method
      </h2>

      <div className="space-y-3" role="radiogroup" aria-label="Payment method">
        {PAYMENT_METHODS.map((method) => (
          <label
            key={method.value}
            className="flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors duration-150"
            style={{
              borderColor: selectedPayment === method.value ? 'var(--color-primary)' : 'var(--color-border)',
              background:  selectedPayment === method.value ? 'var(--color-primary-light)' : 'transparent',
            }}
          >
            <input
              type="radio"
              style={{ accentColor: 'var(--color-primary)' }}
              checked={selectedPayment === method.value}
              onChange={() => setValue('payment_method', method.value, { shouldValidate: true })}
            />
            <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              {method.label}
            </span>
          </label>
        ))}
      </div>

      {errors.payment_method && (
        <p className="mt-2 text-xs" style={{ color: 'var(--color-danger)' }}>
          {errors.payment_method.message}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-xl border py-3 text-sm font-medium"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => { if (selectedPayment) onNext(); else toast.error('Select payment method'); }}
          className="flex-1 rounded-xl py-3 text-sm font-semibold text-white"
          style={{ background: 'var(--color-primary)' }}
        >
          Review Order
        </button>
      </div>
    </div>
  );
}
