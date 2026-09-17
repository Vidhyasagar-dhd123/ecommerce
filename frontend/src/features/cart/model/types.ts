import { z } from 'zod';

// ── Cart Item ─────────────────────────────────────────────
export const CartItemSchema = z.object({
  id: z.number(),
  variant: z.number(),
  variant_details: z.object({
    id: z.number(),
    sku: z.string(),
    color: z.string(),
    size: z.string(),
    price: z.string(),
    stock: z.number(),
    product: z.object({
      id: z.number(),
      name: z.string(),
      slug: z.string(),
      images: z.array(z.object({ image_url: z.string(), is_primary: z.boolean() })),
    }),
    is_in_stock: z.boolean(),
  }),
  quantity: z.number(),
  price: z.string(),        // snapshot price at time of add
  subtotal: z.string().optional(),
});
export type CartItem = z.infer<typeof CartItemSchema>;

// ── Cart ──────────────────────────────────────────────────
export const CartSchema = z.object({
  id: z.number(),
  is_active: z.boolean(),
  items: z.array(CartItemSchema),
  total: z.string().optional(),
});
export type Cart = z.infer<typeof CartSchema>;

// ── Coupon ────────────────────────────────────────────────
export const CouponSchema = z.object({
  id: z.number().optional(),
  code: z.string(),
  discount_type: z.enum(['percent', 'fixed']),
  discount_value: z.union([z.string(), z.number()]),
  min_order_amount: z.union([z.string(), z.number()]).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.boolean().optional(),
  is_valid: z.boolean().optional(),
});
export type Coupon = z.infer<typeof CouponSchema>;

export const CouponValidationSchema = z.object({
  valid: z.boolean(),
  code: z.string(),
  discount_type: z.enum(['percent', 'fixed']),
  discount_value: z.string(),
  message: z.string().optional(),
  coupon: CouponSchema.optional(),
});
export type CouponValidation = z.infer<typeof CouponValidationSchema>;
