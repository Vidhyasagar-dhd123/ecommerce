import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '@/shared/utils/apiHelpers';
import {
  fetchSupportOrders,
  fetchSupportOrderDetail,
  lockOrder,
  unlockOrder,
  confirmOrder,
  updateOrderStatus,
  cancelOrder,
  fetchCustomerDuesSummary,
  fetchCustomerDues,
  assignCustomerDue,
  fetchInventoryList,
  fetchWarehousesList,
  approveReturn,
  rejectReturn,
  createRefund,
} from '../api/supportApi';
import type { AssignDuePayload } from '../model/supportTypes';

export const supportKeys = {
  all: ['support'] as const,
  orders: (params: Record<string, unknown>) => ['support', 'orders', params] as const,
  orderDetail: (id: number) => ['support', 'order', id] as const,
  customerDues: (customerId: number) => ['support', 'dues', customerId] as const,
  customerDuesSummary: (customerId: number) => ['support', 'dues-summary', customerId] as const,
  inventory: (params?: Record<string, unknown>) => ['support', 'inventory', params] as const,
  warehouses: ['support', 'warehouses'] as const,
};

export function useSupportDashboard() {
  const queryClient = useQueryClient();

  // Filters & selection state
  const [activeTab, setActiveTab] = useState<'incoming-orders' | 'inventory-query'>('incoming-orders');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [dueModalCustomerId, setDueModalCustomerId] = useState<number | null>(null);

  // ── Queries ───────────────────────────────────────────────

  const ordersQuery = useQuery({
    queryKey: supportKeys.orders({ status: statusFilter, search: searchQuery }),
    queryFn: () => fetchSupportOrders({ status: statusFilter || undefined, search: searchQuery || undefined }),
    refetchInterval: 10_000, // Live poll every 10s for new incoming orders
  });

  const activeOrderDetailQuery = useQuery({
    queryKey: supportKeys.orderDetail(selectedOrderId!),
    queryFn: () => fetchSupportOrderDetail(selectedOrderId!),
    enabled: selectedOrderId !== null,
  });

  const customerDuesSummaryQuery = useQuery({
    queryKey: supportKeys.customerDuesSummary(activeOrderDetailQuery.data?.customer ?? activeOrderDetailQuery.data?.customer_id ?? 0),
    queryFn: () =>
      fetchCustomerDuesSummary(
        activeOrderDetailQuery.data?.customer ?? activeOrderDetailQuery.data?.customer_id ?? 0
      ),
    enabled: Boolean(
      activeOrderDetailQuery.data?.customer || activeOrderDetailQuery.data?.customer_id
    ),
  });

  const customerDuesQuery = useQuery({
    queryKey: supportKeys.customerDues(activeOrderDetailQuery.data?.customer ?? activeOrderDetailQuery.data?.customer_id ?? 0),
    queryFn: () =>
      fetchCustomerDues(
        activeOrderDetailQuery.data?.customer ?? activeOrderDetailQuery.data?.customer_id ?? 0
      ),
    enabled: Boolean(
      activeOrderDetailQuery.data?.customer || activeOrderDetailQuery.data?.customer_id
    ),
  });

  const inventoryQuery = useQuery({
    queryKey: supportKeys.inventory(),
    queryFn: () => fetchInventoryList(),
  });

  const warehousesQuery = useQuery({
    queryKey: supportKeys.warehouses,
    queryFn: fetchWarehousesList,
    staleTime: 1000 * 60 * 10,
  });

  // ── Mutations ──────────────────────────────────────────────

  const lockMutation = useMutation({
    mutationFn: (id: number) => lockOrder(id),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: supportKeys.all });
      toast.success(`Order #${updated.id} locked to your warehouse`);
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const unlockMutation = useMutation({
    mutationFn: (id: number) => unlockOrder(id),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: supportKeys.all });
      toast.success(`Order #${updated.id} released globally`);
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const confirmMutation = useMutation({
    mutationFn: (id: number) => confirmOrder(id),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: supportKeys.all });
      toast.success(`Order #${updated.id} confirmed!`);
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      updateOrderStatus(id, status),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: supportKeys.all });
      toast.success(`Order #${updated.id} status updated to ${updated.status}`);
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => cancelOrder(id),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: supportKeys.all });
      toast.success(`Order #${updated.id} cancelled & stock restored`);
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const assignDueMutation = useMutation({
    mutationFn: (payload: AssignDuePayload) => assignCustomerDue(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: supportKeys.all });
      setDueModalCustomerId(null);
      toast.success('Due successfully assigned to customer');
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return {
    // State
    activeTab,
    setActiveTab,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    selectedOrderId,
    setSelectedOrderId,
    dueModalCustomerId,
    setDueModalCustomerId,
    // Queries
    ordersQuery,
    activeOrderDetailQuery,
    customerDuesSummaryQuery,
    customerDuesQuery,
    inventoryQuery,
    warehousesQuery,
    // Mutations
    lockMutation,
    unlockMutation,
    confirmMutation,
    updateStatusMutation,
    cancelMutation,
    assignDueMutation,
  };
}
