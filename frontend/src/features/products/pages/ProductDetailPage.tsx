import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart, ChevronRight } from 'lucide-react';

import { useProductDetail } from '../hooks/useProductDetail';
import { ProductGallery }     from '../components/ProductGallery';
import { VariantSelector }    from '../components/VariantSelector';
import { QuantityControl }    from '../components/QuantityControl';
import { ReviewList }         from '../components/ReviewList';
import { ReviewForm }         from '../components/ReviewForm';
import { StarRating }         from '../components/StarRating';
import { ProductDescription } from '../components/ProductDescription';
import { formatCurrency }     from '@utils/formatCurrency';

// ── Skeleton ──────────────────────────────────────────────────
function ProductDetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="aspect-square rounded-2xl" style={{ background: 'var(--color-surface-raised)' }} />
        <div className="space-y-4">
          <div className="h-5 w-1/3 rounded" style={{ background: 'var(--color-surface-raised)' }} />
          <div className="h-8 w-3/4 rounded" style={{ background: 'var(--color-surface-raised)' }} />
          <div className="h-24 rounded" style={{ background: 'var(--color-surface-raised)' }} />
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function ProductDetailPage() {
  const navigate = useNavigate();
  const detail = useProductDetail();

  if (detail.isPending) return <ProductDetailSkeleton />;

  if (detail.isError || !detail.product) {
    return (
      <div className="py-24 text-center">
        <p style={{ color: 'var(--color-text-muted)' }}>Product not found.</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 underline"
          style={{ color: 'var(--color-primary)' }}
        >
          Go back
        </button>
      </div>
    );
  }

  const { product, reviews, addToCartMutation, reviewMutation } = detail;

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1 text-xs"
          style={{ color: 'var(--color-text-muted)' }}>
          <Link to="/" className="hover:underline">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/products" className="hover:underline">Products</Link>
          <ChevronRight className="h-3 w-3" />
          <span style={{ color: 'var(--color-text)' }}>{product.name}</span>
        </nav>

        {/* Two-column grid */}
        <div className="grid gap-10 md:grid-cols-2">

          {/* ── Gallery ── */}
          <ProductGallery
            images={detail.primaryImages}
            active={detail.activeImage}
            onSelect={detail.setActiveImage}
            productName={product.name}
          />

          {/* ── Details ── */}
          <div className="space-y-5">
            <div>
              {product.brand?.brand_name && (
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {product.brand.brand_name}
                </p>
              )}
              <h1 className="mt-1 text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                {product.name}
              </h1>
              <div className="mt-2 flex items-center gap-2">
                <StarRating value={detail.averageRating} />
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  ({reviews?.length ?? 0} reviews)
                </span>
              </div>
            </div>

            {/* Price */}
            <p className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
              {formatCurrency(detail.selectedVariant?.price ?? product.base_price)}
            </p>

            {/* Variant selector */}
            <VariantSelector
              variants={product.variants ?? []}
              selectedId={detail.selectedVariantId}
              onSelect={detail.handleVariantSelect}
            />

            {/* Quantity */}
            <QuantityControl
              value={detail.quantity}
              max={detail.selectedVariant?.stock ?? 99}
              onChange={detail.setQuantity}
            />

            {/* CTA buttons */}
            <div className="flex gap-3">
              <button
                id="add-to-cart-btn"
                onClick={detail.handleAddToCart}
                disabled={!detail.selectedVariant || addToCartMutation.isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-opacity duration-150 disabled:opacity-50"
                style={{ background: 'var(--color-primary)' }}
              >
                <ShoppingCart className="h-4 w-4" />
                {addToCartMutation.isPending ? 'Adding…' : 'Add to Cart'}
              </button>

              <button
                id="wishlist-btn"
                onClick={detail.handleWishlist}
                disabled={detail.toggleWishlistMutation?.isPending}
                aria-label={detail.isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                className="rounded-xl border px-4 py-3 transition-colors duration-150 hover:bg-gray-50 disabled:opacity-50"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <Heart
                  className="h-5 w-5"
                  style={{
                    fill:  detail.isWishlisted ? 'var(--color-danger)' : 'transparent',
                    color: detail.isWishlisted ? 'var(--color-danger)' : 'var(--color-text-muted)',
                  }}
                />
              </button>
            </div>

            {/* Go to cart shortcut */}
            {addToCartMutation.isSuccess && (
              <Link
                to="/cart"
                className="block rounded-xl border py-2.5 text-center text-sm font-medium transition-colors duration-150"
                style={{
                  borderColor: 'var(--color-primary-ring)',
                  background:  'var(--color-primary-light)',
                  color:       'var(--color-primary)',
                }}
              >
                View Cart →
              </Link>
            )}
          </div>
        </div>

        {/* ── Description (JSONField) ── */}
        <ProductDescription description={product.description} />

        {/* ── Reviews ── */}
        <section className="mt-14" aria-labelledby="reviews-heading">
          <h2 id="reviews-heading" className="mb-6 text-xl font-bold" style={{ color: 'var(--color-text)' }}>
            Customer Reviews
          </h2>
          <div className="mb-8">
            <ReviewList reviews={reviews ?? []} />
          </div>
          <ReviewForm reviewMutation={reviewMutation} />
        </section>

      </div>
    </div>
  );
}
