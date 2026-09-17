import { axiosInstance } from '@/shared/lib/axiosInstance';
import { unwrap, unwrapList } from '@/shared/utils/apiHelpers';
import type { AdminStats, AdminUserItem, PromoteEmployeePayload } from '../model/adminTypes';
import type { SupportOrder } from '../model/supportTypes';

// ── Platform Overview Stats ───────────────────────────────
export const fetchAdminStats = async (): Promise<AdminStats> => {
  const res = await axiosInstance.get('/api/v1/auth/admin/stats/');
  return unwrap<AdminStats>(res);
};

// ── User Governance ───────────────────────────────────────
export const fetchAdminUsers = async (params?: {
  role?: string;
  is_active?: boolean;
  page?: number;
}) => {
  const res = await axiosInstance.get('/api/v1/auth/users/', { params });
  return unwrapList<AdminUserItem>(res);
};

export const updateAdminUser = async (
  userId: number,
  data: Partial<AdminUserItem>
): Promise<AdminUserItem> => {
  const res = await axiosInstance.patch(`/api/v1/auth/users/${userId}/`, data);
  return unwrap<AdminUserItem>(res);
};

export const promoteToEmployee = async (payload: PromoteEmployeePayload) => {
  const res = await axiosInstance.post('/api/v1/auth/employees/', payload);
  return unwrap(res);
};

// ── Orders API ────────────────────────────────────────────
export const fetchAdminOrders = async (params?: {
  status?: string;
  search?: string;
  page?: number;
}) => {
  const res = await axiosInstance.get('/api/v1/orders/', { params });
  return unwrapList<SupportOrder>(res);
};

export const updateOrderStatus = async (
  orderId: number,
  status: string
): Promise<SupportOrder> => {
  const res = await axiosInstance.post(`/api/v1/orders/${orderId}/status/`, { status });
  return unwrap<SupportOrder>(res);
};

export const cancelOrder = async (orderId: number): Promise<SupportOrder> => {
  const res = await axiosInstance.post(`/api/v1/orders/${orderId}/cancel/`);
  return unwrap<SupportOrder>(res);
};

// ── Catalog & Returns ─────────────────────────────────────
export const fetchProductsList = async (params?: { page?: number; search?: string }) => {
  const res = await axiosInstance.get('/api/v1/products/', { params });
  return unwrapList<any>(res);
};

export const fetchReturnsList = async () => {
  const res = await axiosInstance.get('/api/v1/fulfillment/returns/');
  return unwrapList<any>(res);
};

export const approveReturn = async (returnId: number) => {
  const res = await axiosInstance.post(`/api/v1/fulfillment/returns/${returnId}/approve/`);
  return unwrap(res);
};

export const rejectReturn = async (returnId: number, reason?: string) => {
  const res = await axiosInstance.post(`/api/v1/fulfillment/returns/${returnId}/reject/`, { reason });
  return unwrap(res);
};
