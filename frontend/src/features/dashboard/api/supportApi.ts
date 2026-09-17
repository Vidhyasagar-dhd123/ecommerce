import { axiosInstance } from '@/shared/lib/axiosInstance';
import { unwrap, unwrapList } from '@/shared/utils/apiHelpers';
import type {
  SupportOrder,
  CustomerDueItem,
  CustomerDuesSummary,
  AssignDuePayload,
  InventoryQueryItem,
} from '../model/supportTypes';

// ── Orders API ────────────────────────────────────────────

export const fetchSupportOrders = async (params: {
  page?: number;
  status?: string;
  search?: string;
}) => {
  const res = await axiosInstance.get('/api/v1/orders/', { params });
  return unwrapList<SupportOrder>(res);
};

export const fetchSupportOrderDetail = async (id: number): Promise<SupportOrder> => {
  const res = await axiosInstance.get(`/api/v1/orders/${id}/`);
  return unwrap<SupportOrder>(res);
};

export const lockOrder = async (id: number): Promise<SupportOrder> => {
  const res = await axiosInstance.post(`/api/v1/orders/${id}/lock/`);
  return unwrap<SupportOrder>(res);
};

export const unlockOrder = async (id: number): Promise<SupportOrder> => {
  const res = await axiosInstance.post(`/api/v1/orders/${id}/unlock/`);
  return unwrap<SupportOrder>(res);
};

export const confirmOrder = async (id: number): Promise<SupportOrder> => {
  const res = await axiosInstance.post(`/api/v1/orders/${id}/confirm/`);
  return unwrap<SupportOrder>(res);
};

export const updateOrderStatus = async (id: number, status: string): Promise<SupportOrder> => {
  const res = await axiosInstance.post(`/api/v1/orders/${id}/status/`, { status });
  return unwrap<SupportOrder>(res);
};

export const cancelOrder = async (id: number): Promise<SupportOrder> => {
  const res = await axiosInstance.post(`/api/v1/orders/${id}/cancel/`);
  return unwrap<SupportOrder>(res);
};

// ── Finance / Dues API ────────────────────────────────────

export const fetchCustomerDues = async (customerId: number): Promise<CustomerDueItem[]> => {
  const res = await axiosInstance.get('/api/v1/finance/dues/', {
    params: { customer_id: customerId },
  });
  const data = unwrapList<CustomerDueItem>(res);
  return data.results;
};

export const fetchCustomerDuesSummary = async (customerId: number): Promise<CustomerDuesSummary> => {
  const res = await axiosInstance.get('/api/v1/finance/dues/summary/', {
    params: { customer_id: customerId },
  });
  return unwrap<CustomerDuesSummary>(res);
};

export const assignCustomerDue = async (payload: AssignDuePayload) => {
  const res = await axiosInstance.post('/api/v1/finance/dues/create/', payload);
  return unwrap(res);
};

export const markDuePaid = async (dueId: number) => {
  const res = await axiosInstance.post(`/api/v1/finance/dues/${dueId}/pay/`);
  return unwrap(res);
};

// ── Inventory Queries API ─────────────────────────────────

export const fetchInventoryList = async (params?: {
  warehouse_id?: number;
  variant_id?: number;
  needs_reorder?: boolean;
}) => {
  const res = await axiosInstance.get('/api/v1/inventory/', { params });
  return unwrapList<InventoryQueryItem>(res);
};

export const fetchWarehousesList = async () => {
  const res = await axiosInstance.get('/api/v1/inventory/warehouses/');
  return unwrapList<{ id: number; name: string; code: string; is_active: boolean }>(res);
};

// ── Returns & Refunds API ─────────────────────────────────

export const approveReturn = async (returnId: number) => {
  const res = await axiosInstance.post(`/api/v1/fulfillment/returns/${returnId}/approve/`);
  return unwrap(res);
};

export const rejectReturn = async (returnId: number, reason?: string) => {
  const res = await axiosInstance.post(`/api/v1/fulfillment/returns/${returnId}/reject/`, { reason });
  return unwrap(res);
};

export const createRefund = async (payload: { return_id: number; amount: string; reason?: string }) => {
  const res = await axiosInstance.post('/api/v1/fulfillment/refunds/', payload);
  return unwrap(res);
};
