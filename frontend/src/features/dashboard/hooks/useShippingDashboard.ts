import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  fetchShippingOrders,
  fetchShippingOrderDetail,
  updateShippingOrderStatus,
  dispatchShipment,
} from '../api/shippingApi';
import type {
  ShippingOrder,
  ShippingStatusFilter,
  DispatchPayload,
  ShippingFilterCounts,
} from '../model/shippingTypes';

import { useAuth } from '@/features/auth/hooks/useAuth';

export function useShippingDashboard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ShippingStatusFilter>('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // Modals state
  const [dispatchOrderTarget, setDispatchOrderTarget] = useState<ShippingOrder | null>(null);
  const [labelOrderTarget, setLabelOrderTarget] = useState<ShippingOrder | null>(null);

  // ── 1. Orders List Query ──────────────────────────────────
  const ordersQuery = useQuery({
    queryKey: ['shipping-orders', user?.userId, user?.warehouseId],
    queryFn: () => fetchShippingOrders(),
    refetchInterval: 20000,
    staleTime: 5000,
  });

  const allOrders = useMemo(() => ordersQuery.data?.results ?? [], [ordersQuery.data]);

  // ── 2. Order Detail Query ─────────────────────────────────
  const activeOrderDetailQuery = useQuery({
    queryKey: ['shipping-order-detail', selectedOrderId, user?.warehouseId],
    queryFn: () => fetchShippingOrderDetail(selectedOrderId!),
    enabled: selectedOrderId !== null,
  });

  // ── 3. Counts Computation ─────────────────────────────────
  const counts: ShippingFilterCounts = useMemo(() => {
    const res: ShippingFilterCounts = {
      all: allOrders.length,
      confirmed: 0,
      shipped: 0,
      delivered: 0,
      returned: 0,
    };
    for (const ord of allOrders) {
      if (ord.status === 'confirmed') res.confirmed += 1;
      else if (ord.status === 'shipped') res.shipped += 1;
      else if (ord.status === 'delivered') res.delivered += 1;
      else if (ord.status === 'returned') res.returned += 1;
    }
    return res;
  }, [allOrders]);

  // ── 4. Filtered Orders ───────────────────────────────────
  const filteredOrders = useMemo(() => {
    return allOrders.filter((ord) => {
      if (statusFilter && ord.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = String(ord.id).includes(q);
        const matchesUser = ord.customer_username?.toLowerCase().includes(q);
        const matchesEmail = ord.customer_email?.toLowerCase().includes(q);
        const matchesCity = ord.address_details?.city?.toLowerCase().includes(q);
        const matchesState = ord.address_details?.state?.toLowerCase().includes(q);
        const matchesTracking = ord.shipment?.tracking_number?.toLowerCase().includes(q);
        const matchesCarrier = ord.shipment?.carrier?.toLowerCase().includes(q);
        if (
          !matchesId &&
          !matchesUser &&
          !matchesEmail &&
          !matchesCity &&
          !matchesState &&
          !matchesTracking &&
          !matchesCarrier
        ) {
          return false;
        }
      }
      return true;
    });
  }, [allOrders, statusFilter, searchQuery]);

  // ── 5. Mutations ──────────────────────────────────────────

  // Update Status directly (shipped, delivered, returned)
  const updateStatusMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: number;
      status: 'shipped' | 'delivered' | 'returned';
    }) => updateShippingOrderStatus(id, status),
    onSuccess: (_, variables) => {
      const statusLabels: Record<string, string> = {
        shipped: 'Shipped (In Transit)',
        delivered: 'Delivered successfully',
        returned: 'Marked as Returned',
      };
      toast.success(
        `Order #${variables.id} status updated to ${statusLabels[variables.status] || variables.status}!`
      );
      void queryClient.invalidateQueries({ queryKey: ['shipping-orders'] });
      void queryClient.invalidateQueries({
        queryKey: ['shipping-order-detail', variables.id],
      });
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        'Failed to update order status.';
      toast.error(msg);
    },
  });

  // Dispatch Shipment with carrier & tracking
  const dispatchMutation = useMutation({
    mutationFn: (payload: DispatchPayload) => dispatchShipment(payload),
    onSuccess: (_, variables) => {
      toast.success(
        `Order #${variables.order_id} dispatched via ${variables.carrier} (${variables.tracking_number})!`
      );
      setDispatchOrderTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['shipping-orders'] });
      void queryClient.invalidateQueries({
        queryKey: ['shipping-order-detail', variables.order_id],
      });
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        'Failed to dispatch shipment.';
      toast.error(msg);
    },
  });

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    selectedOrderId,
    setSelectedOrderId,
    dispatchOrderTarget,
    setDispatchOrderTarget,
    labelOrderTarget,
    setLabelOrderTarget,
    // Data
    ordersQuery,
    allOrders,
    filteredOrders,
    counts,
    activeOrderDetailQuery,
    // Mutations
    updateStatusMutation,
    dispatchMutation,
  };
}
