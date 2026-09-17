import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  fetchOrders, fetchOrder, createOrder, cancelOrder,
  fetchAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress,
  requestReturn, payDue, fetchDues, fetchDuesSummary,
  fetchOffers,
  fetchWishlist, addToWishlist, removeFromWishlist, clearWishlist,
  fetchMe, updateUser, updateProfile,
} from '../api/ordersApi';
import { getApiErrorMessage } from '@utils/apiHelpers';
import { useUIStore } from '@/shared/store/uiStore';
import type { OrderStatus } from '../model/types';

// ── Query Key Factory ─────────────────────────────────────
export const orderKeys = {
  all: ['orders'] as const,
  list: (params: { page?: number; status?: string }) => ['orders', params] as const,
  detail: (id: number) => ['order', id] as const,
  addresses: ['addresses'] as const,
  dues: ['dues'] as const,
  duesSummary: ['dues-summary'] as const,
  offers: ['offers'] as const,
  wishlist: ['wishlist'] as const,
  me: ['me'] as const,
};

// ── Orders ────────────────────────────────────────────────
export function useOrders(params: { page?: number; status?: string } = {}) {
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => fetchOrders(params),
  });
}

export function useOrder(id: number, options: { refetchInterval?: number | false } = {}) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => fetchOrder(id),
    enabled: Number.isFinite(id) && id > 0,
    ...options,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    // No default onError here — CheckoutPage handles errors with handleApiError
    // to support field-level validation errors. Adding one here would double-fire.
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => cancelOrder(id),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: orderKeys.all });
      toast.success('Order cancelled');
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });
}

export function useRequestReturn() {
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: number; reason: string }) =>
      requestReturn(orderId, reason),
    onSuccess: () => toast.success('Return request submitted'),
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });
}

// ── Addresses ─────────────────────────────────────────────
export function useAddresses(params: { page?: number; page_size?: number } = {}) {
  return useQuery({
    queryKey: ['addresses', params],
    queryFn: () => fetchAddresses(params),
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAddress,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.addresses });
      toast.success('Address added');
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateAddress>[1] }) =>
      updateAddress(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.addresses });
      toast.success('Address updated');
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteAddress(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.addresses });
      toast.success('Address removed');
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });
}

export function useSetDefaultAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => setDefaultAddress(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderKeys.addresses }),
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });
}

// ── Dues ──────────────────────────────────────────────────
export function useDues() {
  return useQuery({ queryKey: orderKeys.dues, queryFn: fetchDues });
}

export function useDuesSummary() {
  return useQuery({ queryKey: orderKeys.duesSummary, queryFn: fetchDuesSummary });
}

export function usePayDue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dueId: number) => payDue(dueId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.dues });
      void queryClient.invalidateQueries({ queryKey: orderKeys.duesSummary });
      toast.success('Payment recorded successfully');
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });
}

// ── Offers ────────────────────────────────────────────────
export function useOffers() {
  return useQuery({
    queryKey: orderKeys.offers,
    queryFn: fetchOffers,
    staleTime: 1000 * 60 * 10,
  });
}

export function useWishlist(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: orderKeys.wishlist,
    queryFn: fetchWishlist,
    enabled: options?.enabled ?? true,
  });
}

export function useToggleWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, inWishlist }: { productId: number; inWishlist: boolean }) => {
      if (inWishlist) {
        await removeFromWishlist(productId);
      } else {
        await addToWishlist(productId);
      }
    },
    onMutate: async ({ productId, inWishlist }) => {
      if (inWishlist) {
        useUIStore.getState().removeFromWishlist(productId);
      } else {
        useUIStore.getState().addToWishlist(productId);
      }
    },
    onSuccess: (_, { inWishlist }) => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.wishlist });
      toast.success(inWishlist ? 'Removed from wishlist' : 'Added to wishlist!');
    },
    onError: (err, { productId, inWishlist }) => {
      if (inWishlist) {
        useUIStore.getState().addToWishlist(productId);
      } else {
        useUIStore.getState().removeFromWishlist(productId);
      }
      toast.error(getApiErrorMessage(err));
    },
  });
}

export function useClearWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearWishlist,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.wishlist });
      toast.success('Wishlist cleared');
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });
}

// ── Profile ───────────────────────────────────────────────
export function useMe() {
  return useQuery({ queryKey: orderKeys.me, queryFn: fetchMe });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      username?: string; email?: string;
      date_of_birth?: string; gender?: string;
    }) => {
      await Promise.all([
        updateUser({ username: data.username, email: data.email }),
        updateProfile({ date_of_birth: data.date_of_birth, gender: data.gender }),
      ]);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.me });
      toast.success('Profile updated');
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });
}

// re-export for convenience
export type { OrderStatus };
