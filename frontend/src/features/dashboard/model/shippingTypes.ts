import type { SupportOrder } from './supportTypes';

export type ShippingStatusFilter = '' | 'confirmed' | 'shipped' | 'delivered' | 'returned';

export interface ShipmentDetail {
  id?: number;
  order?: number;
  warehouse?: number;
  warehouse_name?: string;
  tracking_number: string;
  carrier: string;
  ship_date?: string | null;
  delivery_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type ShipmentDetails = ShipmentDetail;

export interface ShippingOrder extends SupportOrder {
  shipment?: ShipmentDetail | null;
}

export type ShippingOrderItem = ShippingOrder;


export interface DispatchPayload {
  order_id: number;
  warehouse_id: number;
  tracking_number: string;
  carrier: string;
  ship_date?: string;
}

export interface MarkDeliveredPayload {
  delivery_date?: string;
}

export interface ShippingFilterCounts {
  all: number;
  confirmed: number;
  shipped: number;
  delivered: number;
  returned: number;
}
