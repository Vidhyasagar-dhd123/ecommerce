import { axiosInstance } from '@/shared/lib/axiosInstance';
import { unwrap, unwrapList } from '@/shared/utils/apiHelpers';
import type {
  ShippingOrder,
  ShipmentDetail,
  DispatchPayload,
  MarkDeliveredPayload,
} from '../model/shippingTypes';

// ── Shipping Executive Orders API ──────────────────────────

export const fetchShippingOrders = async (params?: {
  page?: number;
  status?: string;
  search?: string;
}) => {
  const res = await axiosInstance.get('/api/v1/orders/', { params });
  return unwrapList<ShippingOrder>(res);
};

export const fetchShippingOrderDetail = async (id: number): Promise<ShippingOrder> => {
  const res = await axiosInstance.get(`/api/v1/orders/${id}/`);
  return unwrap<ShippingOrder>(res);
};

export const updateShippingOrderStatus = async (
  id: number,
  status: 'shipped' | 'delivered' | 'returned' | string
): Promise<ShippingOrder> => {
  const res = await axiosInstance.post(`/api/v1/orders/${id}/status/`, { status });
  return unwrap<ShippingOrder>(res);
};

// ── Fulfillment Dispatch & Tracking API ───────────────────

export const dispatchShipment = async (payload: DispatchPayload): Promise<ShipmentDetail> => {
  const res = await axiosInstance.post('/api/v1/fulfillment/shipments/dispatch/', payload);
  return unwrap<ShipmentDetail>(res);
};

export const markShipmentDelivered = async (
  shipmentId: number,
  payload?: MarkDeliveredPayload
): Promise<ShipmentDetail> => {
  const res = await axiosInstance.post(
    `/api/v1/fulfillment/shipments/${shipmentId}/deliver/`,
    payload || {}
  );
  return unwrap<ShipmentDetail>(res);
};
