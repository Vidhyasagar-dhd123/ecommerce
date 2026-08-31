import { useCallback, useMemo, memo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Search, SlidersHorizontal, Heart, ShoppingCart, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { useDebounce } from '@/shared/hooks/useDebounce';
import { usePagination } from '@/shared/hooks/usePagination';
import { useUIStore } from '@/shared/store/uiStore';
import { fetchProducts, fetchCategories, fetchBrands } from '@features/products/api/productsApi';
import { productKeys } from '@features/products/hooks/useProducts';
import { formatCurrency } from '@utils/formatCurrency';
import type { ProductList } from '@features/products/model/types';

// ── Product Card ──────────────────────────────────────────
const ProductCard = memo(function ProductCard({ product }: { product: ProductList }) {
  const navigate = useNavigate();
  const { wishlistIds, addToWishlist, removeFromWishlist } = useUIStore();
  const isWishlisted = wishlistIds.has(product.id);

  const handleWishlist = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      isWishlisted ? removeFromWishlist(product.id) : addToWishlist(product.id);
    },
    [isWishlisted, product.id, addToWishlist, removeFromWishlist],
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
  const cartCount = useUIStore((s) => s.cartCount);

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
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold text-gray-800">
            <ShoppingCart className="h-6 w-6 text-blue-600" /> ShopEase
          </Link>
          <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              id="product-search"
              type="search"
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Search products…"
              aria-label="Search products"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
            />
          </div>
          <Link to="/cart" className="relative p-2" aria-label={`Cart — ${cartCount} items`}>
            <ShoppingCart className="h-6 w-6 text-gray-600" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>
          <Link to="/wishlist" aria-label="Wishlist"><Heart className="h-6 w-6 text-gray-600" /></Link>
          <Link
            to="/profile"
            aria-label="Profile"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600"
          >
            P
          </Link>
        </div>

        {/* Category pills */}
        <nav aria-label="Category filters" className="flex gap-2 overflow-x-auto px-4 pb-3 sm:px-6 lg:px-8">
          <button
            onClick={() => setParam('category', '')}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${!selectedCategory ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            All
          </button>
          {rootCategories.map((c) => (
            <button
              key={c.id}
              onClick={() => setParam('category', String(c.id))}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${selectedCategory === String(c.id) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {c.name}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-500">{isPending ? '—' : `${data?.count ?? 0} products`}</span>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600 hover:bg-red-100"
              >
                <X className="h-3 w-3" /> Clear ({activeFiltersCount})
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="brand-filter" className="text-xs text-gray-500">Brand</label>
            <select
              id="brand-filter"
              value={selectedBrand}
              onChange={(e) => setParam('brand', e.target.value)}
              className="rounded-lg border border-gray-200 py-1.5 pl-2 pr-6 text-xs focus:outline-none"
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