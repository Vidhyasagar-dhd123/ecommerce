import { axiosInstance } from '@lib/axiosInstance';
import { unwrapList, unwrap } from '@utils/apiHelpers';
import { PaginatedOrdersSchema, OrderSchema, AddressSchema } from '../model/types';
import type { OrderStatus } from '../model/types';

export const fetchOrders = async (params: { page?: number; status?: string } = {}) => {
  const res = await axiosInstance.get('/api/v1/orders/', { params });
  return PaginatedOrdersSchema.parse(unwrapList(res));
};

export const fetchOrder = async (id: number) => {
  const res = await axiosInstance.get(`/api/v1/orders/${id}/`);
  return OrderSchema.parse(unwrap(res));
};

export const createOrder = async (payload: {
  address_id: number;
  payment_method: string;
  coupon_code?: string;
}) => {
  const res = await axiosInstance.post('/api/v1/orders/create/', payload);
  return OrderSchema.parse(unwrap(res));
};

export const cancelOrder = async (id: number) => {
  const res = await axiosInstance.post(`/api/v1/orders/${id}/cancel/`);
  return OrderSchema.parse(unwrap(res));
};

// ── Addresses ─────────────────────────────────────────────
export const fetchAddresses = async (params: { page?: number; page_size?: number } = {}) => {
  const res = await axiosInstance.get('/api/v1/auth/me/addresses/', { params });
  const list = unwrapList<import('../model/types').Address>(res);
  return {
    count: list.count,
    next: list.next,
    previous: list.previous,
    results: list.results.map((a) => AddressSchema.parse(a)),
  };
};

export const createAddress = async (payload: Omit<import('../model/types').Address, 'id'>) => {
  const res = await axiosInstance.post('/api/v1/auth/me/addresses/', payload);
  return AddressSchema.parse(unwrap(res));
};

export const updateAddress = async (id: number, payload: Partial<import('../model/types').Address>) => {
  const res = await axiosInstance.put(`/api/v1/auth/me/addresses/${id}/`, payload);
  return AddressSchema.parse(unwrap(res));
};

export const deleteAddress = async (id: number) => {
  await axiosInstance.delete(`/api/v1/auth/me/addresses/${id}/`);
};

export const setDefaultAddress = async (id: number) => {
  // Uses the custom ViewSet action: POST /api/v1/auth/me/addresses/{id}/set-default/
  await axiosInstance.post(`/api/v1/auth/me/addresses/${id}/set-default/`);
  // Re-fetch to get the updated address
  const res = await axiosInstance.get(`/api/v1/auth/me/addresses/${id}/`);
  return AddressSchema.parse(unwrap(res));
};

// ── Fulfillment ───────────────────────────────────────────
export const requestReturn = async (orderId: number, reason: string) => {
  const res = await axiosInstance.post('/api/v1/fulfillment/returns/', {
    order_id: orderId,
    reason,
  });
  return unwrap(res);
};

export const requestRefund = async (paymentId: number, amount: string, reason: string) => {
  const res = await axiosInstance.post('/api/v1/fulfillment/refunds/', {
    payment_id: paymentId,
    amount,
    reason,
  });
  return unwrap(res);
};

// ── Finance ───────────────────────────────────────────────
export const fetchDues = async () => {
  const res = await axiosInstance.get('/api/v1/finance/dues/');
  const list = unwrapList<{
    id: number;
    amount: string;
    status: string;
    due_date: string;
    description?: string;
  }>(res);
  return list.results;
};

export const fetchDuesSummary = async () => {
  const res = await axiosInstance.get('/api/v1/finance/dues/summary/');
  const data = unwrap<Record<string, any>>(res) ?? {};
  return {
    total_outstanding: String(data.total_due ?? data.total_outstanding ?? '0.00'),
    pending_count: Number(data.pending_dues_count ?? data.pending_count ?? 0),
    overdue_count: Number(data.overdue_dues_count ?? data.overdue_count ?? 0),
  };
};

export const payDue = async (dueId: number) => {
  const res = await axiosInstance.post(`/api/v1/finance/dues/${dueId}/pay/`);
  return unwrap(res);
};

// ── Promotions ────────────────────────────────────────────
export const fetchOffers = async () => {
  const res = await axiosInstance.get('/api/v1/promotions/offers/');
  const list = unwrapList<unknown>(res);
  return list.results;
};

// ── Wishlist ──────────────────────────────────────────────
export const fetchWishlist = async () => {
  const res = await axiosInstance.get('/api/v1/wishlist/');
  return unwrap(res) as { id: number; items: { product: import('../../products/model/types').Product }[] };
};

export const addToWishlist = async (productId: number) => {
  const res = await axiosInstance.post('/api/v1/wishlist/add/', { product_id: productId });
  return unwrap(res);
};

export const removeFromWishlist = async (productId: number) => {
  await axiosInstance.delete(`/api/v1/wishlist/remove/${productId}/`);
};

export const clearWishlist = async () => {
  await axiosInstance.delete('/api/v1/wishlist/clear/');
};

// ── Profile ───────────────────────────────────────────────
export const fetchMe = async () => {
  const res = await axiosInstance.get('/api/v1/auth/me/profile/');
  return unwrap(res) as {
    id: number; username: string; email: string; first_name: string; last_name: string;
    role: string; date_joined: string;
    customer_profile?: { date_of_birth: string | null; gender: string | null };
  };
};

export const updateUser = async (payload: { username?: string; email?: string }) => {
  const res = await axiosInstance.patch('/api/v1/auth/me/update/', payload);
  return unwrap(res);
};

export const updateProfile = async (payload: { date_of_birth?: string; gender?: string }) => {
  const res = await axiosInstance.patch('/api/v1/auth/me/', payload);
  return unwrap(res);
};

// ── unused status type import fix ─────────────────────────
export type { OrderStatus };
