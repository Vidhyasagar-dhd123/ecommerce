import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { fetchProductBySlug, fetchProductReviews, submitReview } from '../api/productsApi';
import { addCartItem } from '../../cart/api/cartApi';
import { productKeys } from './useProducts';
import { cartKeys } from '../../cart/hooks/useCart';
import { useToggleWishlist } from '../../orders/hooks/useOrders';
import { useUIStore } from '@/shared/store/uiStore';
import { getApiErrorMessage } from '@utils/apiHelpers';
import type { ReviewFormValues } from '../model/schemas';

/**
 * Encapsulates all data-fetching, mutations, and derived state
 * for the ProductDetailPage. The page file only composes UI from
 * the values returned here — zero data logic in JSX.
 */
export function useProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const { wishlistIds, incrementCart } = useUIStore();
  const toggleWishlistMutation = useToggleWishlist();

  // ── Local UI state ────────────────────────────────────────
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  // ── Queries ───────────────────────────────────────────────
  const { data: product, isPending, isError } = useQuery({
    queryKey: productKeys.detail(slug ?? ''),
    queryFn: () => fetchProductBySlug(slug!),
    enabled: Boolean(slug),
  });

  const { data: reviews } = useQuery({
    queryKey: productKeys.reviews(product?.id ?? 0),
    queryFn: () => fetchProductReviews(product!.id),
    enabled: Boolean(product?.id),
  });

  // ── Auto-select first in-stock variant ───────────────────
  useEffect(() => {
    if (product?.variants && selectedVariantId === null) {
      const first = product.variants.find((v) => v.is_in_stock);
      if (first) setSelectedVariantId(first.id);
    }
  }, [product, selectedVariantId]);

  // Scroll to top on slug change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  // ── Derived ──────────────────────────────────────────────
  const selectedVariant = useMemo(
    () => product?.variants?.find((v) => v.id === selectedVariantId) ?? null,
    [product, selectedVariantId],
  );

  const inStockVariants = useMemo(
    () => product?.variants?.filter((v) => v.is_in_stock) ?? [],
    [product],
  );

  const averageRating = useMemo(() => {
    if (!reviews?.length) return 0;
    return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  }, [reviews]);

  const isWishlisted = useMemo(
    () => (product ? wishlistIds.has(product.id) : false),
    [product, wishlistIds],
  );

  const primaryImages = useMemo(() => product?.images ?? [], [product]);

  // ── Add-to-cart mutation ──────────────────────────────────
  const addToCartMutation = useMutation({
    mutationFn: () => addCartItem(selectedVariant!.id, quantity),
    onMutate: () => incrementCart(),          // optimistic
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cartKeys.cart });
      toast.success('Added to cart!');
    },
    onError: (err) => {
      useUIStore.getState().decrementCart();  // rollback
      toast.error(getApiErrorMessage(err));
    },
  });

  // ── Review mutation ───────────────────────────────────────
  const reviewMutation = useMutation({
    mutationFn: (data: ReviewFormValues) => submitReview(product!.id, data),
    onSuccess: (_, __, ___) => {
      void queryClient.invalidateQueries({ queryKey: productKeys.reviews(product!.id) });
      toast.success('Review submitted!');
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  // ── Stable callbacks ──────────────────────────────────────
  const handleVariantSelect = useCallback((id: number) => {
    setSelectedVariantId(id);
    setQuantity(1);
  }, []);

  const handleAddToCart = useCallback(() => {
    if (!selectedVariant) return toast.error('Select a variant');
    addToCartMutation.mutate();
  }, [selectedVariant, addToCartMutation]);

  const handleWishlist = useCallback(() => {
    if (!product) return;
    toggleWishlistMutation.mutate({ productId: product.id, inWishlist: isWishlisted });
  }, [product, isWishlisted, toggleWishlistMutation]);

  return {
    // data
    product,
    reviews,
    isPending,
    isError,
    // image state
    primaryImages,
    activeImage,
    setActiveImage,
    // variant state
    selectedVariant,
    selectedVariantId,
    inStockVariants,
    handleVariantSelect,
    // quantity state
    quantity,
    setQuantity,
    // derived
    averageRating,
    isWishlisted,
    // mutations
    addToCartMutation,
    reviewMutation,
    toggleWishlistMutation,
    // callbacks
    handleAddToCart,
    handleWishlist,
  };
}
