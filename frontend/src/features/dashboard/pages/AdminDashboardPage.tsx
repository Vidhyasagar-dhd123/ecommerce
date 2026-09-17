import { useAdminDashboard } from '../hooks/useAdminDashboard';
import { AdminHeader } from '../components/AdminHeader';
import { AdminStatsOverview } from '../components/AdminStatsOverview';
import { AdminUserManagementTab } from '../components/AdminUserManagementTab';
import { AdminOrderWorkflowTab } from '../components/AdminOrderWorkflowTab';
import { AdminCatalogTab } from '../components/AdminCatalogTab';
import { AdminReturnsTab } from '../components/AdminReturnsTab';
import { PromoteEmployeeModal } from '../components/PromoteEmployeeModal';

export function AdminDashboardPage() {
  const {
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
  } = useAdminDashboard();

  const users = usersQuery.data?.results ?? [];
  const orders = ordersQuery.data?.results ?? [];
  const products = productsQuery.data?.results ?? [];
  const returns = returnsQuery.data?.results ?? [];

  const handleRefresh = () => {
    void statsQuery.refetch();
    void usersQuery.refetch();
    void ordersQuery.refetch();
    void productsQuery.refetch();
    void returnsQuery.refetch();
  };

  const isRefreshing =
    statsQuery.isFetching ||
    usersQuery.isFetching ||
    ordersQuery.isFetching ||
    productsQuery.isFetching ||
    returnsQuery.isFetching;

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 md:p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ── Superuser Header & Navigation ── */}
        <AdminHeader
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        {/* ── Main Tab Contents ── */}
        {activeTab === 'overview' && (
          <AdminStatsOverview
            stats={statsQuery.data}
            isLoading={statsQuery.isLoading}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'users' && (
          <AdminUserManagementTab
            users={users}
            isLoading={usersQuery.isLoading}
            roleFilter={userRoleFilter}
            onRoleFilterChange={setUserRoleFilter}
            searchQuery={userSearch}
            onSearchChange={setUserSearch}
            onToggleStatus={(userId, is_active) =>
              toggleUserStatusMutation.mutate({ userId, is_active })
            }
            onOpenPromoteModal={setPromoteModalUser}
            isToggling={toggleUserStatusMutation.isPending}
          />
        )}

        {activeTab === 'orders' && (
          <AdminOrderWorkflowTab
            orders={orders}
            isLoading={ordersQuery.isLoading}
            statusFilter={orderStatusFilter}
            onStatusFilterChange={setOrderStatusFilter}
            searchQuery={orderSearch}
            onSearchChange={setOrderSearch}
            onUpdateStatus={(id, status) =>
              updateOrderStatusMutation.mutate({ id, status })
            }
            onCancelOrder={(id) => cancelOrderMutation.mutate(id)}
            isActionPending={
              updateOrderStatusMutation.isPending || cancelOrderMutation.isPending
            }
          />
        )}

        {activeTab === 'catalog' && (
          <AdminCatalogTab
            products={products}
            isLoading={productsQuery.isLoading}
          />
        )}

        {activeTab === 'returns' && (
          <AdminReturnsTab
            returns={returns}
            isLoading={returnsQuery.isLoading}
            onApproveReturn={(id) => approveReturnMutation.mutate(id)}
            onRejectReturn={(id) =>
              rejectReturnMutation.mutate({ returnId: id, reason: 'Rejected by admin' })
            }
            isActionPending={
              approveReturnMutation.isPending || rejectReturnMutation.isPending
            }
          />
        )}
      </div>

      {/* ── Promote Modal ── */}
      <PromoteEmployeeModal
        user={promoteModalUser}
        isOpen={promoteModalUser !== null}
        onClose={() => setPromoteModalUser(null)}
        onSubmit={(payload) => promoteEmployeeMutation.mutate(payload)}
        isPending={promoteEmployeeMutation.isPending}
      />
    </div>
  );
}
export default AdminDashboardPage;
