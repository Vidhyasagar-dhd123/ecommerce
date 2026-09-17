import { useState, useCallback, useMemo, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import AddressCard from '../components/AddressCard';

import {
  useAddresses, useCreateAddress, useUpdateAddress,
  useDeleteAddress, useSetDefaultAddress,
} from '../../orders/hooks/useOrders';
import { handleApiError } from '@utils/apiHelpers';
import type { Address } from '../../orders/model/types';
import { addressSchema, ADDRESS_DEFAULT_VALUES, type AddressFormValues } from '../model/schemas';

type AddressForm = AddressFormValues;
const DEFAULT_VALUES = ADDRESS_DEFAULT_VALUES;


import { usePagination } from '@/shared/hooks/usePagination';

export default function AddressPage() {
  const navigate = useNavigate();
  const { page, setPage } = usePagination(6);
  const { data: addressData, isPending } = useAddresses({ page, page_size: 6 });
  const createMutation = useCreateAddress();
  const updateMutation = useUpdateAddress();
  const deleteMutation = useDeleteAddress();
  const setDefaultMutation = useSetDefaultAddress();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  const addresses = useMemo(
    () => (Array.isArray(addressData) ? addressData : addressData?.results ?? []),
    [addressData],
  );

  const totalCount = useMemo(
    () => (Array.isArray(addressData) ? addressData.length : addressData?.count ?? 0),
    [addressData],
  );

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / 6)), [totalCount]);

  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } =
    useForm<AddressForm>({ resolver: zodResolver(addressSchema), defaultValues: DEFAULT_VALUES });

  // Reset form when editing address changes
  useEffect(() => {
  if (editingAddress) {
    reset({
      name: editingAddress.name ?? '',
      street: editingAddress.street ?? '',
      city: editingAddress.city ?? '',
      state: editingAddress.state ?? '',
      country: editingAddress.country ?? '',
      zipcode: editingAddress.zipcode ?? '',
      landmark: editingAddress.landmark ?? '',
      address_type: (editingAddress.address_type ?? 'Shipping') as "Shipping" | "Billing" | "Other",
      is_default: !!editingAddress.is_default,
    });
  } else {
    reset(DEFAULT_VALUES);
  }
}, [editingAddress, reset]);

  // Derived
  const shippingAddresses = useMemo(
    () => addresses.filter((a) => a.address_type === 'Shipping'),
    [addresses],
  );
  const otherAddresses = useMemo(
    () => addresses.filter((a) => a.address_type !== 'Shipping'),
    [addresses],
  );

  // Callbacks
  const handleOpenCreate = useCallback(() => {
    setEditingAddress(null);
    setModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((addr: Address) => {
    setEditingAddress(addr);
    setModalOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setModalOpen(false);
    setEditingAddress(null);
  }, []);

  const handleDelete = useCallback((id: number) => deleteMutation.mutate(id), [deleteMutation]);
  const handleSetDefault = useCallback((id: number) => setDefaultMutation.mutate(id), [setDefaultMutation]);

  const onSubmit = useCallback(
    (data: AddressForm) => {
      if (editingAddress) {
        updateMutation.mutate(
          { id: editingAddress.id, payload: data as Partial<Address> },
          {
            onSuccess: () => { toast.success('Address updated'); handleClose(); },
            onError: (err) => handleApiError(err, setError, (msg) => toast.error(msg)),
          },
        );
      } else {
        createMutation.mutate(data as Omit<Address, 'id'>, {
          onSuccess: () => { toast.success('Address added'); handleClose(); },
          onError: (err) => handleApiError(err, setError, (msg) => toast.error(msg)),
        });
      }
    },
    [editingAddress, updateMutation, createMutation, handleClose, setError],
  );

  const FIELDS: { id: keyof AddressForm; label: string; type?: string; required?: boolean }[] = [
    { id: 'name', label: 'Full Name', required: true },
    { id: 'street', label: 'Street Address', required: true },
    { id: 'city', label: 'City', required: true },
    { id: 'state', label: 'State', required: true },
    { id: 'country', label: 'Country' },
    { id: 'zipcode', label: 'PIN Code', type: 'text', required: true },
    { id: 'landmark', label: 'Landmark (optional)' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => navigate(-1)} aria-label="Go back" className="text-gray-400 hover:text-gray-600">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">My Addresses</h1>
          <button onClick={handleOpenCreate}
            className="ml-auto rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            + Add New
          </button>
        </div>

        {isPending ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-200" />)}
          </div>
        ) : addresses?.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-400">No addresses saved yet.</p>
            <button onClick={handleOpenCreate}
              className="mt-4 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700">
              Add Address
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {shippingAddresses.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Shipping</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {shippingAddresses.map((addr) => (
                    <AddressCard key={addr.id} address={addr}
                      onEdit={handleOpenEdit} onDelete={handleDelete} onSetDefault={handleSetDefault}
                      isDeleting={deleteMutation.isPending} isSettingDefault={setDefaultMutation.isPending} />
                  ))}
                </div>
              </div>
            )}
            {otherAddresses.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Other</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {otherAddresses.map((addr) => (
                    <AddressCard key={addr.id} address={addr}
                      onEdit={handleOpenEdit} onDelete={handleDelete} onSetDefault={handleSetDefault}
                      isDeleting={deleteMutation.isPending} isSettingDefault={setDefaultMutation.isPending} />
                  ))}
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className="rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-40 hover:bg-gray-50"
                >
                  Prev
                </button>
                <span className="flex items-center text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                  className="rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-40 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          role="dialog" aria-modal="true" aria-labelledby="address-modal-title">
          <div className="mx-4 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="address-modal-title" className="mb-5 font-bold text-gray-900">
              {editingAddress ? 'Edit Address' : 'New Address'}
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {FIELDS.map(({ id, label, type }) => (
                  <div key={id}>
                    <label htmlFor={`addr-${id}`} className="mb-1 block text-xs font-medium text-gray-700">
                      {label}
                    </label>
                    <input
                      id={`addr-${id}`}
                      type={type ?? 'text'}
                      inputMode={id === 'zipcode' ? 'numeric' : undefined}
                      {...register(id)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                    {errors[id] && (
                      <p className="mt-0.5 text-xs text-red-500">{errors[id]?.message as string}</p>
                    )}
                  </div>
                ))}

                <div>
                  <label htmlFor="addr-type" className="mb-1 block text-xs font-medium text-gray-700">Type</label>
                  <select id="addr-type" {...register('address_type')}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                    <option value="Shipping">Shipping</option>
                    <option value="Billing">Billing</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" {...register('is_default')} className="accent-blue-600" />
                Set as default address
              </label>

              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {(createMutation.isPending || updateMutation.isPending) ? 'Saving…' : 'Save Address'}
                </button>
                <button type="button" onClick={handleClose}
                  className="rounded-xl border px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
