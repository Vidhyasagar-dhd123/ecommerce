import { z } from 'zod';

export type SupportTab = 'incoming-orders' | 'inventory-query' | 'returns-refunds';

export interface WarehouseItemDetail {
  variant_id: number;
  product_name: string;
  required: number;
  available: number;
  is_sufficient: boolean;
}

export interface WarehouseAvailability {
  all_available: boolean;
  warehouse_id: number | null;
  warehouse_name?: string | null;
  details: WarehouseItemDetail[];
}

export interface SupportOrderAddress {
  id: number;
  title: string;
  street_address: string;
  apartment_address?: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  phone_number: string;
  address_type?: string;
  is_default?: boolean;
}

export interface SupportOrderItem {
  id: number;
  order: number;
  variant: number;
  product_name?: string;
  product_image?: string | null;
  variant_details?: {
    id: number;
    sku: string;
    color: string;
    size: string;
    price: string;
    stock: number;
    product?: {
      id: number;
      name: string;
      slug: string;
      images?: { image_url: string; is_primary: boolean }[];
    };
    is_in_stock?: boolean;
  };
  quantity: number;
  unit_price: string;
  discount: string;
  total_price: string;
  created_at: string;
}

export interface SupportOrder {
  id: number;
  customer_id?: number;
  customer?: number;
  customer_username?: string | null;
  customer_email?: string | null;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  order_date: string;
  total_amount: string;
  coupon_code?: string;
  items_count?: number;
  can_cancel?: boolean;
  can_reopen?: boolean;
  locked_by_warehouse?: number | null;
  locked_by_warehouse_name?: string | null;
  locked_by?: number | null;
  locked_by_username?: string | null;
  updated_by_username?: string | null;
  is_locked?: boolean;
  locked_at?: string | null;
  address_details?: SupportOrderAddress | null;
  has_dues?: boolean;
  dues_amount?: string;
  warehouse_availability?: WarehouseAvailability;
  items?: SupportOrderItem[];
  payment?: {
    id: number;
    payment_method: string;
    payment_status: string;
    amount: string;
    transaction_id?: string;
    paid_at?: string | null;
  } | null;
  invoice?: {
    id: number;
    invoice_number: string;
    sub_total: string;
    discount: string;
    tax_amount: string;
    shipping_charge: string;
    grand_total: string;
  } | null;
  created_at: string;
  updated_at?: string;
}

export interface CustomerDueItem {
  id: number;
  amount: string;
  due_date: string;
  status: 'pending' | 'settled' | 'overdue';
  warehouse?: number;
  warehouse_name?: string;
  created_at: string;
}

export interface CustomerDuesSummary {
  total_dues: string;
  count: number;
  unsettled_count?: number;
}

export interface AssignDuePayload {
  customer: number;
  amount: string;
  due_date: string;
  warehouse?: number;
  status?: string;
}

export interface InventoryQueryItem {
  id: number;
  warehouse: number;
  warehouse_name?: string;
  variant: number;
  variant_sku?: string;
  product_name?: string;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
  reorder_level: number;
  reorder_quantity: number;
  needs_reorder?: boolean;
}
