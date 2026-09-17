import { useAuth } from '@/features/auth/hooks/useAuth';
import { useShippingDashboard } from '../hooks/useShippingDashboard';
import { ShippingHeader } from '../components/ShippingHeader';
import { ShippingOrdersFeed } from '../components/ShippingOrdersFeed';
import { ShippingOrderDetail } from '../components/ShippingOrderDetail';
import { DispatchModal } from '../components/DispatchModal';
import { ShippingLabelModal } from '../components/ShippingLabelModal';

export function ShippingExecutiveDashboardPage() {
  const { user } = useAuth();
  const warehouseId =
    user?.warehouseId ??
    (user as any)?.employee_profile?.warehouse_id ??
    (user as any)?.warehouse_id ??
    null;

  const {
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
    filteredOrders,
    counts,
    activeOrderDetailQuery,
    // Mutations
    updateStatusMutation,
    dispatchMutation,
  } = useShippingDashboard();

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 md:p-6 text-gray-900">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ── Top Header with Station & Stat Cards ── */}
        <ShippingHeader
          counts={counts}
          currentFilter={statusFilter}
          onFilterChange={setStatusFilter}
          onRefresh={() => void ordersQuery.refetch()}
          isRefreshing={ordersQuery.isFetching}
        />

        {/* ── Active Order Detail Inspector (when selected) ── */}
        {selectedOrderId && (
          <ShippingOrderDetail
            order={activeOrderDetailQuery.data ?? null}
            isLoading={activeOrderDetailQuery.isLoading}
            onClose={() => setSelectedOrderId(null)}
            onOpenDispatchModal={(order) => setDispatchOrderTarget(order)}
            onOpenLabelModal={(order) => setLabelOrderTarget(order)}
            onUpdateStatus={(id, status) => updateStatusMutation.mutate({ id, status })}
            isUpdatingStatus={updateStatusMutation.isPending || dispatchMutation.isPending}
          />
        )}

        {/* ── Warehouse Locked Orders Feed ── */}
        <ShippingOrdersFeed
          orders={filteredOrders}
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
          onOpenDispatchModal={(order) => setDispatchOrderTarget(order)}
          onOpenLabelModal={(order) => setLabelOrderTarget(order)}
          onUpdateStatus={(id, status) => updateStatusMutation.mutate({ id, status })}
          isUpdatingStatus={updateStatusMutation.isPending || dispatchMutation.isPending}
        />
      </div>

      {/* ── Modal: Dispatch with Carrier Tracking ── */}
      <DispatchModal
        order={dispatchOrderTarget}
        warehouseId={warehouseId}
        isOpen={dispatchOrderTarget !== null}
        onClose={() => setDispatchOrderTarget(null)}
        onSubmit={(payload) => dispatchMutation.mutate(payload)}
        isPending={dispatchMutation.isPending}
      />

      {/* ── Modal: Print Shipping Label / Packing Slip ── */}
      <ShippingLabelModal
        order={labelOrderTarget}
        isOpen={labelOrderTarget !== null}
        onClose={() => setLabelOrderTarget(null)}
      />
    </div>
  );
}
export default ShippingExecutiveDashboardPage;
