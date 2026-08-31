import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { fetchCart, updateCartItem, removeCartItem, clearCart, addCartItem } from '../api/cartApi';
import { getApiErrorMessage } from '@utils/apiHelpers';

export const cartKeys = {
  cart: ['cart'] as const,
};

export function useCart() {
  return useQuery({
    queryKey: cartKeys.cart,
    queryFn: fetchCart,
    staleTime: 0, // cart must always be fresh
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ variantId, quantity }: { variantId: number; quantity: number }) =>
      addCartItem(variantId, quantity),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cartKeys.cart });
      toast.success('Added to cart');
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: number; quantity: number }) =>
      updateCartItem(itemId, quantity),
    onMutate: async ({ itemId, quantity }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: cartKeys.cart });
      const prev = queryClient.getQueryData(cartKeys.cart);
      queryClient.setQueryData(cartKeys.cart, (old: import('../model/types').Cart | undefined) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((i) =>
            i.id === itemId ? { ...i, quantity } : i,
          ),
        };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(cartKeys.cart, ctx.prev);
      toast.error('Failed to update quantity');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: cartKeys.cart }),
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) => removeCartItem(itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: cartKeys.cart });
      const prev = queryClient.getQueryData(cartKeys.cart);
      queryClient.setQueryData(cartKeys.cart, (old: { items: { id: number }[] } | undefined) => {
        if (!old) return old;
        return { ...old, items: old.items.filter((i) => i.id !== itemId) };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(cartKeys.cart, ctx.prev);
      toast.error('Failed to remove item');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: cartKeys.cart }),
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearCart,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cartKeys.cart });
      toast.success('Cart cleared');
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });
}
