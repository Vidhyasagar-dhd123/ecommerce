import { z } from 'zod';

// ── Category ──────────────────────────────────────────────
export const CategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  parent: z.number().nullable(),
  status: z.boolean(),
});
export type Category = z.infer<typeof CategorySchema>;

// ── Brand ─────────────────────────────────────────────────
export const BrandSchema = z
  .object({
    id: z.number(),
    brand_name: z.string(),
    slug: z.string().optional(),
    status: z.boolean().optional(),
  })
  .passthrough();
export type Brand = z.infer<typeof BrandSchema>;

// ── Product Image ─────────────────────────────────────────
export const ProductImageSchema = z
  .object({
    id: z.number().optional(),
    image_url: z.string(),
    is_primary: z.boolean().optional(),
  })
  .passthrough();
export type ProductImage = z.infer<typeof ProductImageSchema>;

// ── Product Variant ───────────────────────────────────────
export const ProductVariantSchema = z
  .object({
    id: z.number(),
    sku: z.string(),
    color: z.string().nullable().optional(),
    size: z.string().nullable().optional(),
    price: z.union([z.string(), z.number()]), // decimal as string or number from DRF
    stock: z.number().optional(),
    weight: z.string().nullable().optional(),
    status: z.boolean().optional(),
    is_in_stock: z.boolean().optional(),
  })
  .passthrough();
export type ProductVariant = z.infer<typeof ProductVariantSchema>;

// ── Product (list) ────────────────────────────────────────
export const ProductSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    base_price: z.union([z.string(), z.number()]),
    category: CategorySchema.optional(),
    brand: BrandSchema.nullable().optional(),
    images: z.array(ProductImageSchema).optional(),
    status: z.boolean().optional(),
    description: z.union([z.string(), z.record(z.unknown())]).optional(),
  })
  .passthrough();
export type Product = z.infer<typeof ProductSchema>;

export const ProductListSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    base_price: z.union([z.string(), z.number()]),
    category_name: z.string().nullable().optional(),
    brand_name: z.string().nullable().optional(),
    primary_image: z.string().nullable().optional(),
    status: z.boolean().optional(),
  })
  .passthrough();
export type ProductList = z.infer<typeof ProductListSchema>;

// ── Product (detail — includes variants) ─────────────────
export const ProductDetailSchema = ProductSchema.extend({
  variants: z.array(ProductVariantSchema).optional(),
});
export type ProductDetail = z.infer<typeof ProductDetailSchema>;

// ── Paginated products ────────────────────────────────────
export const PaginatedProductsSchema = z.object({
  count: z.number(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(ProductSchema),
});
export type PaginatedProducts = z.infer<typeof PaginatedProductsSchema>;

export const PaginatedProductListSchema = z.object({
  count: z.number(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(ProductListSchema),
});
export type PaginatedProductList = z.infer<typeof PaginatedProductListSchema>;

// ── Review ────────────────────────────────────────────────
export const ReviewSchema = z
  .object({
    id: z.number(),
    rating: z.number().min(1).max(5),
    comment: z.string(),
    customer: z.number().optional(),
    created_at: z.string().optional(),
  })
  .passthrough();
export type Review = z.infer<typeof ReviewSchema>;

// ── Product filter params ─────────────────────────────────
export interface ProductFilters {
  category?: string;
  brand?: string;
  search?: string;
  min_price?: string;
  max_price?: string;
  page?: number;
  page_size?: number;
}
