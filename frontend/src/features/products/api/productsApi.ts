import { axiosInstance } from '@lib/axiosInstance';
import { unwrapList, unwrap, unwrapArray } from '@utils/apiHelpers';
import {
  PaginatedProductListSchema,
  ProductDetailSchema,
  CategorySchema,
  BrandSchema,
  ReviewSchema,
} from '../model/types';
import type { ProductFilters } from '../model/types';

export const fetchProducts = async (filters: ProductFilters = {}) => {
  const res = await axiosInstance.get('/api/v1/products/', { params: filters });
  return PaginatedProductListSchema.parse(unwrapList(res));
};

export const fetchProductBySlug = async (slug: string) => {
  const res = await axiosInstance.get(`/api/v1/products/${slug}/`);
  return ProductDetailSchema.parse(unwrap(res));
};

export const fetchCategories = async () => {
  const res = await axiosInstance.get('/api/v1/products/categories/');
  const data = unwrapArray<unknown>(res);
  return data.map((c) => CategorySchema.parse(c));
};

export const fetchBrands = async () => {
  const res = await axiosInstance.get('/api/v1/products/brands/');
  const data = unwrapArray<unknown>(res);
  return data.map((b) => BrandSchema.parse(b));
};

export const fetchProductReviews = async (productId: number) => {
  const res = await axiosInstance.get(`/api/v1/reviews/products/${productId}/`);
  const data = unwrapArray<unknown>(res);
  return data.map((r) => ReviewSchema.parse(r));
};

export const submitReview = async (
  productId: number,
  payload: { rating: number; comment: string },
) => {
  const res = await axiosInstance.post(
    `/api/v1/reviews/products/${productId}/submit/`,
    payload,
  );
  return ReviewSchema.parse(unwrap(res));
};
