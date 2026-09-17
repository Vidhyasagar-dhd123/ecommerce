import { axiosInstance } from '@/shared/lib/axiosInstance';
import { unwrap, unwrapList } from '@/shared/utils/apiHelpers';
import type {
  WarehouseInventoryItem,
  WarehouseStats,
  StockTransactionItem,
  StockAdjustPayload,
  StockTransferPayload,
  WarehouseOption,
  VendorItem,
  CreateVendorPayload,
  VendorImportItem,
  CreateImportPayload,
  ProductVariantOption,
} from '../model/inventoryTypes';

export async function fetchWarehouseInventory(params?: {
  warehouse_id?: number;
  needs_reorder?: boolean;
}): Promise<WarehouseInventoryItem[]> {
  const res = await axiosInstance.get('/api/v1/inventory/', { params });
  const unwrapped = unwrapList<WarehouseInventoryItem>(res);
  return unwrapped.results;
}

export async function fetchWarehouseStats(warehouseId?: number | null): Promise<WarehouseStats> {
  const res = await axiosInstance.get('/api/v1/inventory/stats/', {
    params: warehouseId ? { warehouse_id: warehouseId } : undefined,
  });
  return unwrap<WarehouseStats>(res);
}

export async function adjustStock(payload: StockAdjustPayload): Promise<StockTransactionItem> {
  const res = await axiosInstance.post('/api/v1/inventory/adjust/', payload);
  return unwrap<StockTransactionItem>(res);
}

export async function transferStock(payload: StockTransferPayload): Promise<{
  message: string;
  source_transaction: StockTransactionItem;
  target_transaction: StockTransactionItem;
  quantity: number;
}> {
  const res = await axiosInstance.post('/api/v1/inventory/transfer/', payload);
  return unwrap<any>(res);
}

export async function fetchStockTransactions(params?: {
  warehouse_id?: number;
  type?: string;
}): Promise<StockTransactionItem[]> {
  const res = await axiosInstance.get('/api/v1/inventory/transactions/', { params });
  const unwrapped = unwrapList<StockTransactionItem>(res);
  return unwrapped.results;
}

export async function fetchWarehouses(): Promise<WarehouseOption[]> {
  const res = await axiosInstance.get('/api/v1/inventory/warehouses/', {
    params: { for_transfer: 'true' },
  });
  const unwrapped = unwrapList<WarehouseOption>(res);
  return unwrapped.results;
}

export async function fetchVendors(): Promise<VendorItem[]> {
  const res = await axiosInstance.get('/api/v1/vendors/');
  const unwrapped = unwrapList<VendorItem>(res);
  return unwrapped.results;
}

export async function createVendor(payload: CreateVendorPayload): Promise<VendorItem> {
  const res = await axiosInstance.post('/api/v1/vendors/', payload);
  return unwrap<VendorItem>(res);
}

export async function fetchImports(params?: {
  status?: string;
  vendor_id?: number;
}): Promise<VendorImportItem[]> {
  const res = await axiosInstance.get('/api/v1/imports/', { params });
  const unwrapped = unwrapList<VendorImportItem>(res);
  return unwrapped.results;
}

export async function createImport(payload: CreateImportPayload): Promise<VendorImportItem> {
  const res = await axiosInstance.post('/api/v1/imports/', payload);
  return unwrap<VendorImportItem>(res);
}

export async function receiveImport(importId: number): Promise<VendorImportItem> {
  const res = await axiosInstance.post(`/api/v1/imports/${importId}/receive/`, {});
  return unwrap<VendorImportItem>(res);
}

export async function fetchAllVariants(): Promise<ProductVariantOption[]> {
  const res = await axiosInstance.get('/api/v1/products/variants/all/');
  return Array.isArray(res.data) ? res.data : unwrapList<ProductVariantOption>(res).results;
}
