import { useMemo, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { useWishlist, useClearWishlist, useToggleWishlist } from '../../orders/hooks/useOrders';
import { addCartItem } from '../../cart/api/cartApi';
import { cartKeys } from '../../cart/hooks/useCart';
import { useUIStore } from '@/shared/store/uiStore';
import { formatCurrency } from '@utils/formatCurrency';
import { getApiErrorMessage } from '@utils/apiHelpers';
import type { Product } from '../../products/model/types';

export default function WishlistPage() {
  const queryClient = useQueryClient();
  const { data: wishlist, isPending } = useWishlist();
  const clearMutation = useClearWishlist();
  const toggleMutation = useToggleWishlist();
  const { syncWishlistIds } = useUIStore();

  // Sync global store with fetched data
  useEffect(() => {
    if (wishlist?.items) {
      syncWishlistIds(wishlist.items.map((i) => i.product.id));
    }
  }, [wishlist, syncWishlistIds]);

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async (product: Product) => {
      const defaultVariant = (product as Product & { variants?: { id: number; stock: number; is_in_stock: boolean }[] }).variants?.find(
        (v) => v.is_in_stock,
      );
      if (!defaultVariant) throw new Error('Out of stock');
      await addCartItem(defaultVariant.id, 1);
    },
    onSuccess: (_, product) => {
      void queryClient.invalidateQueries({ queryKey: cartKeys.cart });
      toggleMutation.mutate({ productId: product.id, inWishlist: true });
      toast.success('Moved to cart!');
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const wishlistProducts = useMemo(
    () => wishlist?.items.map((i) => i.product) ?? [],
    [wishlist],
  );

  const handleRemove = useCallback(
    (productId: number) => toggleMutation.mutate({ productId, inWishlist: true }),
    [toggleMutation],
  );

  const handleMoveToCart = useCallback(
    (product: Product) => addToCartMutation.mutate(product),
    [addToCartMutation],
  );

  const handleClear = useCallback(() => clearMutation.mutate(), [clearMutation]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            Wishlist <span className="text-base font-normal text-gray-400">({wishlistProducts.length})</span>
          </h1>
          {wishlistProducts.length > 0 && (
            <button onClick={handleClear} disabled={clearMutation.isPending}
              className="flex items-center gap-1 text-sm text-red-400 hover:text-red-600">
              <Trash2 className="h-4 w-4" /> Clear all
            </button>
          )}
        </div>

        {isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-gray-200" />)}
          </div>
        ) : wishlistProducts.length === 0 ? (
          <div className="py-20 text-center">
            <Heart className="mx-auto mb-3 h-12 w-12 text-gray-200" />
            <p className="text-gray-400">Your wishlist is empty</p>
            <Link to="/products" className="mt-4 inline-block rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700">
              Discover Products
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {wishlistProducts.map((product) => {
              const image = product.images.find((i) => i.is_primary) ?? product.images[0];
              return (
                <div key={product.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <Link to={`/products/${product.slug}`}>
                    <div className="mb-3 aspect-square overflow-hidden rounded-xl bg-gray-50">
                      {image ? (
                        <img src={image.image_url} alt={product.name} width={300} height={300}
                          loading="lazy" className="h-full w-full object-cover hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-200">No image</div>
                      )}
                    </div>
                  </Link>

                  <p className="text-xs text-gray-400">{product.brand?.brand_name}</p>
                  <h2 className="line-clamp-2 text-sm font-semibold text-gray-800">{product.name}</h2>
                  <p className="mt-1 text-base font-bold text-blue-600">{formatCurrency(product.base_price)}</p>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleMoveToCart(product)}
                      disabled={addToCartMutation.isPending}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" /> Add to Cart
                    </button>
                    <button
                      onClick={() => handleRemove(product.id)}
                      aria-label={`Remove ${product.name} from wishlist`}
                      className="rounded-xl border p-2 text-gray-400 hover:border-red-300 hover:text-red-500"
                    >
                      <Heart className="h-4 w-4 fill-red-400 text-red-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
