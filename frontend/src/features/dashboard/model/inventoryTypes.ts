export interface WarehouseInventoryItem {
  id: number;
  warehouse: number;
  warehouse_name: string;
  variant: number;
  variant_sku: string;
  stock: number;
  reserved_stock: number;
  available_stock: number;
  reorder_level: number;
  needs_reorder: boolean;
  updated_at: string;
}

export interface WarehouseStats {
  warehouse_id: number;
  warehouse_name: string;
  total_skus: number;
  total_stock: number;
  total_reserved: number;
  total_available: number;
  reorder_alerts_count: number;
  recent_transactions_count: number;
  pending_imports_count: number;
}

export interface StockTransactionItem {
  id: number;
  variant: number;
  variant_sku: string;
  warehouse_name: string;
  type: 'import' | 'ship' | 'sale' | 'return' | 'adjustment' | 'transfer_out' | 'transfer_in';
  quantity: number;
  transaction_date: string;
  reference_id?: string;
  notes?: string;
  performed_by?: string | null;
  created_at: string;
}

export type StockTransaction = StockTransactionItem;


export interface StockAdjustPayload {
  inventory_id: number;
  quantity: number;
  transaction_type: 'adjustment' | 'return' | 'import';
  reference_id?: string;
  notes?: string;
}

export interface StockTransferItem {
  variant_id: number;
  quantity: number;
}

export interface StockTransferPayload {
  target_warehouse_id: number;
  notes?: string;
  variant_id?: number;
  quantity?: number;
  items?: StockTransferItem[];
}

export interface WarehouseOption {
  id: number;
  name: string;
  location?: string;
}

export interface VendorItem {
  id: number;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface CreateVendorPayload {
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface VendorImportLineItem {
  id: number;
  variant: number;
  variant_sku?: string;
  quantity: number;
  unit_cost: string | number;
  total_cost: string | number;
}

export interface VendorImportItem {
  id: number;
  vendor: number;
  vendor_name?: string;
  warehouse: number;
  warehouse_name?: string;
  import_date: string;
  status: 'pending' | 'received' | 'verified' | 'rejected';
  total_amount: string | number;
  items: VendorImportLineItem[];
  created_at: string;
}

export interface CreateImportItemPayload {
  variant_id: number;
  quantity: number;
  unit_cost: number;
}

export interface CreateImportPayload {
  vendor_id: number;
  items: CreateImportItemPayload[];
  warehouse_id?: number;
  import_date?: string;
}

export interface ProductVariantOption {
  id: number;
  product?: number;
  product_name?: string;
  sku: string;
  color?: string;
  size?: string;
  price: string;
  stock?: number;
}

export type InventoryTab = 'inventory' | 'transfers' | 'vendors' | 'audit';
