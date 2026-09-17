import { useCallback, useMemo, memo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, Heart, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { useDebounce } from '@/shared/hooks/useDebounce';
import { usePagination } from '@/shared/hooks/usePagination';
import { useUIStore } from '@/shared/store/uiStore';
import { fetchProducts, fetchCategories, fetchBrands } from '@features/products/api/productsApi';
import { productKeys } from '@features/products/hooks/useProducts';
import { formatCurrency } from '@utils/formatCurrency';
import type { ProductList } from '@features/products/model/types';

import { useToggleWishlist } from '@features/orders/hooks/useOrders';

// ── Product Card ──────────────────────────────────────────
const ProductCard = memo(function ProductCard({ product }: { product: ProductList }) {
  const navigate = useNavigate();
  const { wishlistIds } = useUIStore();
  const toggleWishlistMutation = useToggleWishlist();
  const isWishlisted = wishlistIds.has(product.id);

  const handleWishlist = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleWishlistMutation.mutate({ productId: product.id, inWishlist: isWishlisted });
    },
    [isWishlisted, product.id, toggleWishlistMutation],
  );

  return (
    <article
      role="article"
      onClick={() => navigate(`/products/${product.slug}`)}
      className="group relative cursor-pointer rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
    >
      <button
        aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        onClick={handleWishlist}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/80 p-1.5 shadow backdrop-blur"
      >
        <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
      </button>

      <div className="mb-3 aspect-square overflow-hidden rounded-xl bg-gray-50">
        {product.primary_image ? (
          <img src={product.primary_image} alt={product.name} loading="lazy" width={400} height={400}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300">No image</div>
        )}
      </div>

      <p className="mb-0.5 text-xs text-gray-400">{product.brand_name ?? '—'}</p>
      <h3 className="line-clamp-2 text-sm font-semibold text-gray-800">{product.name}</h3>
      <p className="mt-2 text-base font-bold text-blue-600">{formatCurrency(product.base_price)}</p>
    </article>
  );
});

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-100 bg-white p-4">
      <div className="mb-3 aspect-square rounded-xl bg-gray-200" />
      <div className="mb-2 h-3 w-1/3 rounded bg-gray-200" />
      <div className="mb-1 h-4 w-full rounded bg-gray-200" />
      <div className="h-5 w-1/2 rounded bg-gray-200" />
    </div>
  );
}

function Pagination({ count, page, pageSize, onPageChange }: {
  count: number; page: number; pageSize: number; onPageChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(count / pageSize);
  if (totalPages <= 1) return null;

  // Show page window around current page
  const startPage = Math.max(1, page - 2);
  const endPage = Math.min(totalPages, page + 2);
  const pages = [];
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-2">
      <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
        className="rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-40 hover:bg-gray-50">Prev</button>
      {startPage > 1 && (
        <>
          <button onClick={() => onPageChange(1)} className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50">1</button>
          {startPage > 2 && <span className="px-1 text-gray-400">…</span>}
        </>
      )}
      {pages.map((p) => (
        <button key={p} onClick={() => onPageChange(p)} aria-current={p === page ? 'page' : undefined}
          className={`rounded-lg border px-3 py-2 text-sm font-medium ${p === page ? 'border-blue-600 bg-blue-600 text-white' : 'hover:bg-gray-50'}`}>
          {p}
        </button>
      ))}
      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span className="px-1 text-gray-400">…</span>}
          <button onClick={() => onPageChange(totalPages)} className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50">{totalPages}</button>
        </>
      )}
      <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
        className="rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-40 hover:bg-gray-50">Next</button>
    </nav>
  );
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { page, setPage } = usePagination(12);

  const searchInput = searchParams.get('search') ?? '';
  const selectedCategory = searchParams.get('category') ?? '';
  const selectedBrand = searchParams.get('brand') ?? '';
  const debouncedSearch = useDebounce(searchInput, 400);

  const filters = useMemo(() => ({
    search: debouncedSearch || undefined,
    category: selectedCategory || undefined,
    brand: selectedBrand || undefined,
    page,
    page_size: 12,
  }), [debouncedSearch, selectedCategory, selectedBrand, page]);

  const { data, isPending, isError } = useQuery({
    queryKey: productKeys.list(filters),
    queryFn: () => fetchProducts(filters),
  });

  const { data: categories } = useQuery({
    queryKey: productKeys.categories,
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 10,
  });

  const { data: brands } = useQuery({
    queryKey: productKeys.brands,
    queryFn: fetchBrands,
    staleTime: 1000 * 60 * 10,
  });

  const rootCategories = useMemo(
    () => (categories ?? []).filter((c) => c.parent === null),
    [categories],
  );

  const selectedCatObj = useMemo(
    () => (categories ?? []).find((c) => String(c.id) === selectedCategory),
    [categories, selectedCategory],
  );

  const activeRootCategory = useMemo(() => {
    if (!selectedCatObj) return null;
    if (selectedCatObj.parent === null) return selectedCatObj;
    return (categories ?? []).find((c) => c.id === selectedCatObj.parent) ?? null;
  }, [selectedCatObj, categories]);

  const subCategories = useMemo(() => {
    if (!activeRootCategory) return [];
    return (categories ?? []).filter((c) => c.parent === activeRootCategory.id);
  }, [activeRootCategory, categories]);

  const activeFiltersCount = useMemo(
    () => [selectedCategory, selectedBrand, debouncedSearch].filter(Boolean).length,
    [selectedCategory, selectedBrand, debouncedSearch],
  );

  const setParam = useCallback((key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      next.delete('page');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const clearFilters = useCallback(() => setSearchParams({}, { replace: true }), [setSearchParams]);
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setParam('search', e.target.value),
    [setParam],
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Main Category Pills Bar */}
      <div className="border-b bg-white" style={{ borderColor: 'var(--color-border)' }}>
        <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6 lg:px-8">
          <nav aria-label="Category filters" className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setParam('category', '')}
              className={`whitespace-nowrap rounded-full px-3.5 py-1 text-xs font-medium transition ${
                !selectedCategory
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={{
                background: !selectedCategory ? 'var(--color-primary)' : undefined,
              }}
            >
              All Categories
            </button>
            {rootCategories.map((c) => {
              const isRootActive = activeRootCategory?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setParam('category', String(c.id))}
                  className={`whitespace-nowrap rounded-full px-3.5 py-1 text-xs font-medium transition ${
                    isRootActive
                      ? 'text-white font-semibold'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={{
                    background: isRootActive ? 'var(--color-primary)' : undefined,
                  }}
                >
                  {c.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Subcategory Pills Bar (if a category is active) */}
      {subCategories.length > 0 && activeRootCategory && (
        <div className="border-b bg-gray-50/80" style={{ borderColor: 'var(--color-border)' }}>
          <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
            <nav aria-label="Subcategory filters" className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
              <span className="text-xs font-semibold text-gray-500 shrink-0">{activeRootCategory.name}:</span>
              <button
                onClick={() => setParam('category', String(activeRootCategory.id))}
                className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  selectedCategory === String(activeRootCategory.id)
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                All {activeRootCategory.name}
              </button>
              {subCategories.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setParam('category', String(sub.id))}
                  className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    selectedCategory === String(sub.id)
                      ? 'bg-blue-100 text-blue-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {sub.name}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Mobile Search fallback */}
        <div className="sm:hidden mb-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              id="product-search-mobile"
              type="search"
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Search products…"
              aria-label="Search products"
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-500">{isPending ? '—' : `${data?.count ?? 0} products`}</span>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600 hover:bg-red-100"
              >
                <X className="h-3 w-3" /> Clear ({activeFiltersCount})
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="brand-filter" className="text-xs text-gray-500 font-medium">Brand</label>
            <select
              id="brand-filter"
              value={selectedBrand}
              onChange={(e) => setParam('brand', e.target.value)}
              className="rounded-lg border border-gray-200 bg-white py-1.5 pl-2 pr-6 text-xs focus:border-blue-500 focus:outline-none"
            >
              <option value="">All brands</option>
              {(brands ?? []).map((b) => (
                <option key={b.id} value={b.id}>{b.brand_name}</option>
              ))}
            </select>
          </div>
        </div>

        {isError ? (
          <div className="py-20 text-center text-red-500">Failed to load products. Please try again.</div>
        ) : isPending ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : data?.results.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            No products found.{' '}
            <button onClick={clearFilters} className="text-blue-600 underline">Clear filters</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {data?.results.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
            <Pagination count={data?.count ?? 0} page={page} pageSize={12} onPageChange={setPage} />
          </>
        )}
      </main>
    </div>
  );
}