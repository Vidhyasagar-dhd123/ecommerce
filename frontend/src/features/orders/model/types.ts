import { z } from 'zod';

// ── Address ───────────────────────────────────────────────
export const AddressSchema = z
  .object({
    id: z.number(),
    name: z.string().nullable().optional(),
    street: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    zipcode: z.string().nullable().optional(),
    landmark: z.string().nullable().optional(),
    address_type: z.string().optional(),
    is_default: z.boolean().optional(),
  })
  .passthrough();
export type Address = z.infer<typeof AddressSchema>;

// ── Payment ───────────────────────────────────────────────
export const PaymentSchema = z
  .object({
    id: z.number().optional(),
    order: z.number().optional(),
    payment_method: z.string().optional(),
    payment_status: z.string().optional(),
    amount: z.union([z.string(), z.number()]).optional(),
    transaction_id: z.string().nullable().optional(),
    paid_at: z.string().nullable().optional(),
  })
  .passthrough();
export type Payment = z.infer<typeof PaymentSchema>;

// ── Invoice ───────────────────────────────────────────────
export const InvoiceSchema = z
  .object({
    id: z.number().optional(),
    order: z.number().optional(),
    invoice_number: z.string().optional(),
    invoice_date: z.string().nullable().optional(),
    sub_total: z.union([z.string(), z.number()]).optional(),
    discount: z.union([z.string(), z.number()]).optional(),
    tax_amount: z.union([z.string(), z.number()]).optional(),
    shipping_charge: z.union([z.string(), z.number()]).optional(),
    grand_total: z.union([z.string(), z.number()]).optional(),
    created_at: z.string().optional(),
  })
  .passthrough();
export type Invoice = z.infer<typeof InvoiceSchema>;

// ── Order Item ────────────────────────────────────────────
export const OrderItemSchema = z
  .object({
    id: z.number(),
    order: z.number().optional(),
    variant: z.union([z.number(), z.object({ id: z.number() }).passthrough()]).optional().nullable(),
    variant_details: z
      .object({
        id: z.number().optional(),
        sku: z.string().optional(),
        color: z.string().nullable().optional(),
        size: z.string().nullable().optional(),
        price: z.union([z.string(), z.number()]).optional(),
        product: z
          .object({
            id: z.number().optional(),
            name: z.string().optional(),
            slug: z.string().optional(),
          })
          .passthrough()
          .optional()
          .nullable(),
        product_name: z.string().optional(),
        images: z
          .array(z.object({ image_url: z.string(), is_primary: z.boolean().optional() }).passthrough())
          .optional(),
      })
      .passthrough()
      .optional()
      .nullable(),
    quantity: z.number(),
    unit_price: z.union([z.string(), z.number()]),
    discount: z.union([z.string(), z.number()]).optional(),
    total_price: z.union([z.string(), z.number()]),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .passthrough();
export type OrderItem = z.infer<typeof OrderItemSchema>;

// ── Order Status ──────────────────────────────────────────
export const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// ── Order List (compact) ──────────────────────────────────
export const OrderListSchema = z
  .object({
    id: z.number(),
    status: z.string(),
    order_date: z.string().optional(),
    total_amount: z.union([z.string(), z.number()]),
    items_count: z.number().optional(),
    can_cancel: z.boolean().optional(),
    locked_by_warehouse: z.number().nullable().optional(),
    locked_by_warehouse_name: z.string().nullable().optional(),
    is_locked: z.boolean().optional(),
    locked_at: z.string().nullable().optional(),
    created_at: z.string().optional(),
  })
  .passthrough();
export type OrderList = z.infer<typeof OrderListSchema>;

// ── Order Detail ──────────────────────────────────────────
export const OrderSchema = z
  .object({
    id: z.number(),
    status: z.string(),
    order_date: z.string().optional(),
    total_amount: z.union([z.string(), z.number()]),
    coupon_code: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    address: z.number().optional().nullable(),
    address_details: AddressSchema.optional().nullable(),
    can_cancel: z.boolean().optional(),
    items: z.array(OrderItemSchema).optional(),
    payment: PaymentSchema.optional().nullable(),
    invoice: InvoiceSchema.optional().nullable(),
    shipment: z
      .object({
        id: z.number().optional(),
        tracking_number: z.string().optional(),
        carrier: z.string().optional(),
        ship_date: z.string().nullable().optional(),
        delivery_date: z.string().nullable().optional(),
      })
      .passthrough()
      .optional()
      .nullable(),
  })
  .passthrough();
export type Order = z.infer<typeof OrderSchema>;

// ── Paginated Orders ──────────────────────────────────────
export const PaginatedOrdersSchema = z.object({
  count: z.number(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(OrderListSchema),
});
export type PaginatedOrders = z.infer<typeof PaginatedOrdersSchema>;

