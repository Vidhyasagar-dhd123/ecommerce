import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  fetchAdminStats,
  fetchAdminUsers,
  updateAdminUser,
  promoteToEmployee,
  fetchAdminOrders,
  updateOrderStatus,
  cancelOrder,
  fetchProductsList,
  fetchReturnsList,
  approveReturn,
  rejectReturn,
} from '../api/adminApi';
import type { PromoteEmployeePayload } from '../model/adminTypes';

export type AdminDashboardTab =
  | 'overview'
  | 'users'
  | 'orders'
  | 'catalog'
  | 'returns';

export function useAdminDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminDashboardTab>('overview');

  // User tab filters
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userSearch, setUserSearch] = useState<string>('');

  // Orders tab filters
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // Promote Modal State
  const [promoteModalUser, setPromoteModalUser] = useState<{ id: number; username: string } | null>(null);

  // ── Queries ──────────────────────────────────────────────
  const statsQuery = useQuery({
    queryKey: ['admin-stats'],
    queryFn: fetchAdminStats,
    refetchInterval: 30000,
  });

  const usersQuery = useQuery({
    queryKey: ['admin-users', userRoleFilter],
    queryFn: () =>
      fetchAdminUsers({
        role: userRoleFilter === 'all' ? undefined : userRoleFilter,
      }),
  });

  const ordersQuery = useQuery({
    queryKey: ['admin-orders', orderStatusFilter, orderSearch],
    queryFn: () =>
      fetchAdminOrders({
        status: orderStatusFilter === 'all' ? undefined : orderStatusFilter,
        search: orderSearch || undefined,
      }),
  });

  const productsQuery = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => fetchProductsList(),
  });

  const returnsQuery = useQuery({
    queryKey: ['admin-returns'],
    queryFn: () => fetchReturnsList(),
  });

  // ── Mutations ────────────────────────────────────────────
  const toggleUserStatusMutation = useMutation({
    mutationFn: ({ userId, is_active }: { userId: number; is_active: boolean }) =>
      updateAdminUser(userId, { is_active, status: is_active }),
    onSuccess: () => {
      toast.success('User status updated');
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: () => toast.error('Failed to update user status'),
  });

  const promoteEmployeeMutation = useMutation({
    mutationFn: (payload: PromoteEmployeePayload) => promoteToEmployee(payload),
    onSuccess: () => {
      toast.success('User promoted to Employee successfully');
      setPromoteModalUser(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: () => toast.error('Failed to promote user to employee'),
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      updateOrderStatus(id, status),
    onSuccess: () => {
      toast.success('Order status updated');
      void queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: () => toast.error('Failed to update order status'),
  });

  const cancelOrderMutation = useMutation({
    mutationFn: (id: number) => cancelOrder(id),
    onSuccess: () => {
      toast.success('Order cancelled');
      void queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: () => toast.error('Failed to cancel order'),
  });

  const approveReturnMutation = useMutation({
    mutationFn: (returnId: number) => approveReturn(returnId),
    onSuccess: () => {
      toast.success('Return approved');
      void queryClient.invalidateQueries({ queryKey: ['admin-returns'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: () => toast.error('Failed to approve return'),
  });

  const rejectReturnMutation = useMutation({
    mutationFn: ({ returnId, reason }: { returnId: number; reason?: string }) =>
      rejectReturn(returnId, reason),
    onSuccess: () => {
      toast.success('Return rejected');
      void queryClient.invalidateQueries({ queryKey: ['admin-returns'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: () => toast.error('Failed to reject return'),
  });

  return {
    activeTab,
    setActiveTab,
    userRoleFilter,
    setUserRoleFilter,
    userSearch,
    setUserSearch,
    orderStatusFilter,
    setOrderStatusFilter,
    orderSearch,
    setOrderSearch,
    selectedOrderId,
    setSelectedOrderId,
    promoteModalUser,
    setPromoteModalUser,
    // Queries
    statsQuery,
    usersQuery,
    ordersQuery,
    productsQuery,
    returnsQuery,
    // Mutations
    toggleUserStatusMutation,
    promoteEmployeeMutation,
    updateOrderStatusMutation,
    cancelOrderMutation,
    approveReturnMutation,
    rejectReturnMutation,
  };
}
