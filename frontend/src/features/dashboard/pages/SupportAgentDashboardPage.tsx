import { useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSupportDashboard } from '../hooks/useSupportDashboard';
import { SupportHeader } from '../components/SupportHeader';
import { IncomingOrdersFeed } from '../components/IncomingOrdersFeed';
import { OrderProcessingDetail } from '../components/OrderProcessingDetail';
import { InventoryQueryTab } from '../components/InventoryQueryTab';
import { AssignDueModal } from '../components/AssignDueModal';

export function SupportAgentDashboardPage() {
  const { user } = useAuth();
  const currentWarehouseId =
    (user as any)?.employee_profile?.warehouse_id ?? (user as any)?.warehouse_id;



  const {
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
  } = useSupportDashboard();

  const [dueCustomerName, setDueCustomerName] = useState<string | undefined>();

  const orders = ordersQuery.data?.results ?? [];
  const inventoryItems = inventoryQuery.data?.results ?? [];
  const warehouses = warehousesQuery.data?.results ?? [];

  const handleOpenDueModal = (customerId: number, name?: string) => {
    setDueCustomerName(name);
    setDueModalCustomerId(customerId);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 md:p-6 text-gray-900">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ── Support Agent Header ── */}
        <SupportHeader
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onRefresh={() => {
            void ordersQuery.refetch();
            void inventoryQuery.refetch();
          }}
          isRefreshing={ordersQuery.isFetching || inventoryQuery.isFetching}
          totalOrdersCount={orders.length}
        />

        {/* ── Main Tab Content ── */}
        {activeTab === 'incoming-orders' && (
          <div className="space-y-6">
            {/* When an order is selected, show detail processor on top/side */}
            {selectedOrderId && (
              <OrderProcessingDetail
                order={activeOrderDetailQuery.data ?? null}
                isLoading={activeOrderDetailQuery.isLoading}
                onClose={() => setSelectedOrderId(null)}
                onLock={(id) => lockMutation.mutate(id)}
                onUnlock={(id) => unlockMutation.mutate(id)}
                onConfirm={(id) => confirmMutation.mutate(id)}
                onCancel={(id) => cancelMutation.mutate(id)}
                onUpdateStatus={(id, status) => updateStatusMutation.mutate({ id, status })}
                isActionPending={
                  lockMutation.isPending ||
                  unlockMutation.isPending ||
                  confirmMutation.isPending ||
                  updateStatusMutation.isPending ||
                  cancelMutation.isPending
                }
                duesSummary={customerDuesSummaryQuery.data}
                customerDues={customerDuesQuery.data}
                onOpenDueModal={handleOpenDueModal}
                currentWarehouseId={currentWarehouseId}
              />
            )}

            {/* Live Incoming Orders Table */}
            <IncomingOrdersFeed
              orders={orders}
              isPending={ordersQuery.isLoading}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              selectedOrderId={selectedOrderId}
              onSelectOrder={(id) => {
                setSelectedOrderId(id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onLockOrder={(id) => lockMutation.mutate(id)}
              onUnlockOrder={(id) => unlockMutation.mutate(id)}
              isLocking={lockMutation.isPending || unlockMutation.isPending}
              currentWarehouseId={currentWarehouseId}
              onOpenDueModal={handleOpenDueModal}
            />
          </div>
        )}

        {activeTab === 'inventory-query' && (
          <InventoryQueryTab
            inventory={inventoryItems}
            isLoading={inventoryQuery.isLoading}
            warehouses={warehouses}
          />
        )}
      </div>

      {/* ── Assign Due Modal ── */}
      <AssignDueModal
        customerId={dueModalCustomerId}
        customerName={dueCustomerName}
        isOpen={dueModalCustomerId !== null}
        onClose={() => setDueModalCustomerId(null)}
        onSubmit={(payload) => assignDueMutation.mutate(payload)}
        isPending={assignDueMutation.isPending}
      />
    </div>
  );
}
