import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Heart, ShoppingCart, Star, Minus, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { fetchProductBySlug, fetchProductReviews, submitReview } from '../api/productsApi';
import { addCartItem } from '../../cart/api/cartApi';
import { productKeys } from '../hooks/useProducts';
import { cartKeys } from '../../cart/hooks/useCart';
import { useUIStore } from '@/shared/store/uiStore';
import { formatCurrency } from '@utils/formatCurrency';
import { formatDateTime } from '@utils/formatDate';
import { getApiErrorMessage } from '@utils/apiHelpers';

// ── Review form schema ─────────────────────────────────────
const reviewSchema = z.object({
  rating: z.number({ required_error: 'Select a rating' }).min(1).max(5),
  comment: z.string().min(10, 'Minimum 10 characters').max(500, 'Maximum 500 characters'),
});
type ReviewForm = z.infer<typeof reviewSchema>;

// ── Star Rating Input ──────────────────────────────────────
function StarInput({
  value, onChange,
}: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star`}
          onClick={() => onChange(star)}
          className="focus:outline-none"
        >
          <Star
            className={`h-6 w-6 transition-colors ${
              star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { wishlistIds, addToWishlist, removeFromWishlist, incrementCart } = useUIStore();

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
    () => product?.variants.find((v) => v.id === selectedVariantId) ?? null,
    [product, selectedVariantId],
  );

  const inStockVariants = useMemo(
    () => product?.variants.filter((v) => v.is_in_stock) ?? [],
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

  const primaryImages = useMemo(
    () => product?.images ?? [],
    [product],
  );

  // ── Mutations ─────────────────────────────────────────────
  const addToCartMutation = useMutation({
    mutationFn: () => addCartItem(selectedVariant!.id, quantity),
    onMutate: () => incrementCart(), // optimistic
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cartKeys.cart });
      toast.success('Added to cart!');
    },
    onError: (err) => {
      useUIStore.getState().decrementCart(); // rollback
      toast.error(getApiErrorMessage(err));
    },
  });

  // ── Review form ───────────────────────────────────────────
  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } =
    useForm<ReviewForm>({ resolver: zodResolver(reviewSchema), defaultValues: { rating: 0, comment: '' } });

  const ratingValue = watch('rating');

  const reviewMutation = useMutation({
    mutationFn: (data: ReviewForm) => submitReview(product!.id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.reviews(product!.id) });
      reset();
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
    isWishlisted ? removeFromWishlist(product.id) : addToWishlist(product.id);
  }, [product, isWishlisted, addToWishlist, removeFromWishlist]);

  const onReviewSubmit = useCallback(
    (data: ReviewForm) => reviewMutation.mutate(data),
    [reviewMutation],
  );

  // ── Render states ─────────────────────────────────────────
  if (isPending) {
    return (
      <div className="mx-auto max-w-7xl animate-pulse px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="aspect-square rounded-2xl bg-gray-200" />
          <div className="space-y-4">
            <div className="h-6 w-3/4 rounded bg-gray-200" />
            <div className="h-8 w-1/2 rounded bg-gray-200" />
            <div className="h-32 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="py-24 text-center">
        <p className="text-gray-500">Product not found.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 underline">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1 text-xs text-gray-400">
          <Link to="/" className="hover:text-gray-600">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/products" className="hover:text-gray-600">Products</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-700">{product.name}</span>
        </nav>

        <div className="grid gap-10 md:grid-cols-2">
          {/* ── Images ── */}
          <div className="space-y-3">
            <div className="aspect-square overflow-hidden rounded-2xl bg-white shadow">
              {primaryImages[activeImage] ? (
                <img
                  src={primaryImages[activeImage].image_url}
                  alt={product.name}
                  width={600}
                  height={600}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-300">No image</div>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {primaryImages.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(idx)}
                  aria-label={`Image ${idx + 1}`}
                  className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition ${
                    activeImage === idx ? 'border-blue-600' : 'border-transparent'
                  }`}
                >
                  <img src={img.image_url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* ── Details ── */}
          <div className="space-y-5">
            <div>
              <p className="text-sm text-gray-400">{product.brand?.brand_name}</p>
              <h1 className="mt-1 text-2xl font-bold text-gray-900">{product.name}</h1>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex">
                  {[1,2,3,4,5].map((s) => (
                    <Star
                      key={s}
                      className={`h-4 w-4 ${s <= Math.round(averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-400">({reviews?.length ?? 0} reviews)</span>
              </div>
            </div>

            <p className="text-3xl font-bold text-blue-600">
              {formatCurrency(selectedVariant?.price ?? product.base_price)}
            </p>

            {/* Variant selector */}
            {product.variants.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">Select Variant</p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Variants">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      role="radio"
                      aria-checked={selectedVariantId === v.id}
                      onClick={() => handleVariantSelect(v.id)}
                      disabled={!v.is_in_stock}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                        selectedVariantId === v.id
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : v.is_in_stock
                          ? 'border-gray-200 hover:border-blue-300'
                          : 'cursor-not-allowed border-gray-100 text-gray-300 line-through'
                      }`}
                    >
                      {v.color} / {v.size}
                    </button>
                  ))}
                </div>
                {inStockVariants.length === 0 && (
                  <p className="mt-2 text-sm font-semibold text-red-500">Out of Stock</p>
                )}
              </div>
            )}

            {/* Quantity */}
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium text-gray-700">Qty</p>
              <div className="flex items-center gap-1 rounded-lg border">
                <button
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 hover:bg-gray-50"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-[2rem] text-center text-sm font-semibold">{quantity}</span>
                <button
                  aria-label="Increase quantity"
                  onClick={() =>
                    setQuantity((q) => Math.min(selectedVariant?.stock ?? 99, q + 1))
                  }
                  className="px-3 py-2 hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleAddToCart}
                disabled={!selectedVariant || addToCartMutation.isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                <ShoppingCart className="h-4 w-4" />
                {addToCartMutation.isPending ? 'Adding…' : 'Add to Cart'}
              </button>
              <button
                onClick={handleWishlist}
                aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                className="rounded-xl border px-4 py-3 transition hover:bg-gray-50"
              >
                <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
              </button>
            </div>

            {/* Go to cart */}
            {addToCartMutation.isSuccess && (
              <Link
                to="/cart"
                className="block rounded-xl border border-blue-200 bg-blue-50 py-2.5 text-center text-sm font-medium text-blue-700 hover:bg-blue-100"
              >
                View Cart →
              </Link>
            )}
          </div>
        </div>

        {/* ── Reviews ── */}
        <section className="mt-14" aria-labelledby="reviews-heading">
          <h2 id="reviews-heading" className="mb-6 text-xl font-bold text-gray-900">
            Customer Reviews
          </h2>

          {/* Review list */}
          <div className="mb-8 space-y-4">
            {reviews?.length === 0 && (
              <p className="text-sm text-gray-400">No reviews yet. Be the first!</p>
            )}
            {reviews?.map((review) => (
              <div key={review.id} className="rounded-xl border bg-white p-4">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1,2,3,4,5].map((s) => (
                      <Star
                        key={s}
                        className={`h-4 w-4 ${s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-400">{formatDateTime(review.created_at)}</span>
                </div>
                <p className="mt-2 text-sm text-gray-700">{review.comment}</p>
              </div>
            ))}
          </div>

          {/* Submit review form */}
          <div className="rounded-2xl border bg-white p-6">
            <h3 className="mb-4 font-semibold text-gray-800">Write a Review</h3>
            <form onSubmit={handleSubmit(onReviewSubmit)} className="space-y-4" noValidate>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Rating</label>
                <StarInput value={ratingValue} onChange={(v) => setValue('rating', v, { shouldValidate: true })} />
                {errors.rating && <p className="mt-1 text-xs text-red-500">{errors.rating.message}</p>}
              </div>
              <div>
                <label htmlFor="review-comment" className="mb-1 block text-sm font-medium text-gray-700">Comment</label>
                <textarea
                  id="review-comment"
                  {...register('comment')}
                  rows={4}
                  placeholder="Share your experience…"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                />
                {errors.comment && <p className="mt-1 text-xs text-red-500">{errors.comment.message}</p>}
              </div>
              <button
                type="submit"
                disabled={isSubmitting || reviewMutation.isPending}
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {reviewMutation.isPending ? 'Submitting…' : 'Submit Review'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
