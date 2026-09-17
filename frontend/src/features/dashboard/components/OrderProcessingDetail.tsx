import { X, Clock } from 'lucide-react';
import { OrderAvailabilityBadge } from './OrderAvailabilityBadge';
import { OrderStatusTransitionControl } from './OrderStatusTransitionControl';
import { OrderCustomerProfileCard } from './OrderCustomerProfileCard';
import { OrderDeliveryAddressCard } from './OrderDeliveryAddressCard';
import { OrderItemsStockTable } from './OrderItemsStockTable';
import { OrderFinancialSummaryCard } from './OrderFinancialSummaryCard';
import type {
  SupportOrder,
  CustomerDuesSummary,
  CustomerDueItem,
} from '../model/supportTypes';

interface Props {
  order: SupportOrder | null;
  isLoading: boolean;
  onClose: () => void;
  onLock: (id: number) => void;
  onUnlock: (id: number) => void;
  onConfirm: (id: number) => void;
  onCancel: (id: number) => void;
  onUpdateStatus?: (id: number, status: string) => void;
  isActionPending: boolean;
  duesSummary?: CustomerDuesSummary;
  customerDues?: CustomerDueItem[];
  onOpenDueModal: (customerId: number, name?: string) => void;
  currentWarehouseId?: number | null;
}

export function OrderProcessingDetail({
  order,
  isLoading,
  onClose,
  onLock,
  onUnlock,
  onConfirm,
  onCancel,
  onUpdateStatus,
  isActionPending,
  duesSummary,
  onOpenDueModal,
  currentWarehouseId,
}: Props) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-xs animate-pulse space-y-4">
        <div className="h-6 w-1/3 bg-gray-200 rounded-md" />
        <div className="h-24 bg-gray-100 rounded-xl" />
        <div className="h-40 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-xs">
        <p className="text-sm font-semibold text-gray-500">
          Select an order from the feed to view processing details and perform actions.
        </p>
      </div>
    );
  }

  const isLocked = order.is_locked;
  const isWarehouseStaff = Boolean(
    !currentWarehouseId ||
    !order.locked_by_warehouse ||
    order.locked_by_warehouse === currentWarehouseId
  );
  const isLockedByMyWarehouse = Boolean(
    isLocked && (!currentWarehouseId || order.locked_by_warehouse === currentWarehouseId)
  );
  const canRelease = Boolean(isLocked && order.status === 'pending');
  const canCancel = Boolean(isLockedByMyWarehouse && order.can_cancel && order.status !== 'cancelled');
  const canReopen = Boolean(
    order.status === 'cancelled' &&
    (order.can_reopen ?? true) &&
    isWarehouseStaff
  );
  const customerId = order.customer_id ?? order.customer ?? 0;

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === order.status) return;
    if (newStatus === 'cancelled') {
      if (
        window.confirm(
          `Are you sure you want to cancel Order #${order.id}? Reserved inventory stock will be restored.`
        )
      ) {
        onCancel(order.id);
      }
      return;
    }
    if (order.status === 'cancelled' && newStatus === 'pending') {
      if (
        window.confirm(
          `Reinstate Order #${order.id} back to Pending? Inventory stock will be re-reserved.`
        )
      ) {
        onUpdateStatus?.(order.id, 'pending');
      }
      return;
    }
    onUpdateStatus?.(order.id, newStatus);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-xs overflow-hidden">
      {/* ── Top Header ── */}
      <div className="border-b border-gray-100 p-5 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-white to-gray-50/50">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900">
              Order #{order.id}
            </h2>
            <span
              className={`rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${
                order.status === 'confirmed'
                  ? 'bg-blue-100 text-blue-800'
                  : order.status === 'delivered'
                  ? 'bg-emerald-100 text-emerald-800'
                  : order.status === 'cancelled'
                  ? 'bg-red-100 text-red-800'
                  : order.status === 'shipped'
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {order.status}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Placed on {new Date(order.order_date).toLocaleString()}
          </p>
        </div>

        <button
          onClick={onClose}
          className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer"
          title="Close details"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* ── Action Control Bar & Status Radio Controller ── */}
      <OrderStatusTransitionControl
        orderId={order.id}
        status={order.status}
        isLocked={isLocked}
        isLockedByMyWarehouse={isLockedByMyWarehouse}
        canReopen={canReopen}
        canRelease={canRelease}
        canCancel={canCancel}
        isActionPending={isActionPending}
        lockedByWarehouseName={order.locked_by_warehouse_name}
        lockedByUsername={order.locked_by_username}
        updatedByUsername={order.updated_by_username}
        onStatusChange={handleStatusChange}
        onUnlock={onUnlock}
        onConfirm={onConfirm}
        onCancel={onCancel}
        onOpenDueModal={() => onOpenDueModal(customerId, order.customer_username ?? undefined)}
        hasCustomerId={customerId > 0}
        availabilityBadge={<OrderAvailabilityBadge availability={order.warehouse_availability} />}
      />

      <div className="p-6 space-y-6">
        {/* ── Grid: Customer Info & Shipping Address ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <OrderCustomerProfileCard
            customerId={customerId}
            username={order.customer_username}
            email={order.customer_email}
            hasDues={order.has_dues}
            duesAmount={order.dues_amount}
            duesSummary={duesSummary}
          />
          <OrderDeliveryAddressCard
            address={order.address_details}
            allowCopyPhone={false}
          />
        </div>

        {/* ── Order Line Items & Live Inventory Matrix ── */}
        <OrderItemsStockTable
          items={order.items || []}
          availability={order.warehouse_availability}
        />

        {/* ── Financial Breakdown & Payment Summary ── */}
        <OrderFinancialSummaryCard
          payment={order.payment}
          invoice={order.invoice}
          couponCode={order.coupon_code}
          totalAmount={order.total_amount}
        />
      </div>
    </div>
  );
}
