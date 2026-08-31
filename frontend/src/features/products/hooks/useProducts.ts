import { useQuery } from '@tanstack/react-query';
import { fetchProducts, fetchCategories, fetchBrands } from '../api/productsApi';
import type { ProductFilters } from '../model/types';

export const productKeys = {
  all: ['products'] as const,
  list: (filters: ProductFilters) => ['products', filters] as const,
  detail: (slug: string) => ['product', slug] as const,
  categories: ['categories'] as const,
  brands: ['brands'] as const,
  reviews: (id: number) => ['reviews', id] as const,
};

export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: () => fetchProducts(filters),
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: productKeys.detail(slug),
    queryFn: () => fetchProducts({ search: slug }), // will be overridden by detail hook
    enabled: false,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: productKeys.categories,
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 10, // categories rarely change
  });
}

export function useBrands() {
  return useQuery({
    queryKey: productKeys.brands,
    queryFn: fetchBrands,
    staleTime: 1000 * 60 * 10,
  });
}
