import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MapPin, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import type { UseFormSetValue } from 'react-hook-form';
import type { UseMutationResult } from '@tanstack/react-query';

import { addressSchema, type AddressFormValues, type CheckoutFormValues } from '../model/schemas';
import { handleApiError } from '@utils/apiHelpers';
import type { Address } from '../../orders/model/types';

interface AddressStepProps {
  addresses: Address[];
  loadingAddresses: boolean;
  selectedAddressId: number | undefined;
  setValue: UseFormSetValue<CheckoutFormValues>;
  errors: { address_id?: { message?: string } };
  createAddressMutation: UseMutationResult<Address, Error, Omit<Address, 'id'>>;
  onNext: () => void;
}

const ADDR_FIELDS = [
  ['name',     'Name'],
  ['street',   'Street'],
  ['city',     'City'],
  ['state',    'State'],
  ['zipcode',  'PIN Code'],
  ['landmark', 'Landmark (optional)'],
] as const;

export function AddressStep({
  addresses, loadingAddresses, selectedAddressId, setValue, errors,
  createAddressMutation, onNext,
}: AddressStepProps) {
  const [showForm, setShowForm] = useState(false);

  const addrForm = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: { country: 'India', address_type: 'Shipping', is_default: false },
  });

  const handleAddAddress = addrForm.handleSubmit((data) => {
    createAddressMutation.mutate(data as Parameters<typeof createAddressMutation.mutate>[0], {
      onSuccess: (addr) => {
        setValue('address_id', addr.id);
        setShowForm(false);
        addrForm.reset();
      },
      onError: (err) => handleApiError(err, addrForm.setError, (msg) => toast.error(msg)),
    });
  });

  return (
    <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold" style={{ color: 'var(--color-text)' }}>
          <MapPin className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
          Delivery Address
        </h2>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1 text-sm font-medium hover:underline"
          style={{ color: 'var(--color-primary)' }}
        >
          <Plus className="h-4 w-4" /> Add new
        </button>
      </div>

      {/* Inline new-address form */}
      {showForm && (
        <div
          className="mb-5 rounded-xl border border-dashed p-4"
          style={{ borderColor: 'var(--color-primary-ring)', background: 'var(--color-primary-light)' }}
        >
          <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>New Address</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {ADDR_FIELDS.map(([field, label]) => (
              <div key={field}>
                <label htmlFor={`co-addr-${field}`} className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  {label}
                </label>
                <input
                  id={`co-addr-${field}`}
                  {...addrForm.register(field)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: 'var(--color-border)' }}
                />
                {addrForm.formState.errors[field] && (
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--color-danger)' }}>
                    {addrForm.formState.errors[field]?.message}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleAddAddress}
              disabled={createAddressMutation.isPending}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: 'var(--color-primary)' }}
            >
              {createAddressMutation.isPending ? 'Saving…' : 'Save Address'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border px-4 py-2 text-xs font-medium"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Address list */}
      {loadingAddresses ? (
        <div className="animate-pulse space-y-3">
          <div className="h-16 rounded-xl" style={{ background: 'var(--color-surface-raised)' }} />
          <div className="h-16 rounded-xl" style={{ background: 'var(--color-surface-raised)' }} />
        </div>
      ) : (
        <div className="space-y-3" role="radiogroup" aria-label="Delivery address">
          {addresses.map((addr) => (
            <label
              key={addr.id}
              className="flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors duration-150"
              style={{
                borderColor: selectedAddressId === addr.id ? 'var(--color-primary)' : 'var(--color-border)',
                background:  selectedAddressId === addr.id ? 'var(--color-primary-light)' : 'transparent',
              }}
            >
              <input
                type="radio"
                className="mt-1"
                style={{ accentColor: 'var(--color-primary)' }}
                checked={selectedAddressId === addr.id}
                onChange={() => setValue('address_id', addr.id, { shouldValidate: true })}
              />
              <div className="text-sm">
                <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{addr.name}</p>
                <p style={{ color: 'var(--color-text-secondary)' }}>{addr.street}, {addr.city} — {addr.zipcode}</p>
                <p style={{ color: 'var(--color-text-muted)' }}>{addr.state}, {addr.country}</p>
              </div>
            </label>
          ))}
        </div>
      )}

      {errors.address_id && (
        <p className="mt-2 text-xs" style={{ color: 'var(--color-danger)' }}>
          {errors.address_id.message}
        </p>
      )}

      <button
        type="button"
        onClick={() => { if (selectedAddressId) onNext(); else toast.error('Select an address'); }}
        className="mt-6 w-full rounded-xl py-3 text-sm font-semibold text-white"
        style={{ background: 'var(--color-primary)' }}
      >
        Continue to Payment
      </button>
    </div>
  );
}
