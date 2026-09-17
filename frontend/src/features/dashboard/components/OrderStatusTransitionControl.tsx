import {
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  CreditCard,
} from 'lucide-react';

interface Props {
  orderId: number;
  status: string;
  isLocked: boolean;
  isLockedByMyWarehouse: boolean;
  canReopen: boolean;
  canRelease: boolean;
  canCancel: boolean;
  isActionPending: boolean;
  lockedByWarehouseName?: string | null;
  lockedByUsername?: string | null;
  updatedByUsername?: string | null;
  onStatusChange: (newStatus: string) => void;
  onUnlock: (orderId: number) => void;
  onConfirm: (orderId: number) => void;
  onCancel: (orderId: number) => void;
  onOpenDueModal?: () => void;
  hasCustomerId?: boolean;
  availabilityBadge?: React.ReactNode;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function OrderStatusTransitionControl({
  orderId,
  status,
  isLocked,
  isLockedByMyWarehouse,
  canReopen,
  canRelease,
  canCancel,
  isActionPending,
  lockedByWarehouseName,
  lockedByUsername,
  updatedByUsername,
  onStatusChange,
  onUnlock,
  onConfirm,
  onCancel,
  onOpenDueModal,
  hasCustomerId,
  availabilityBadge,
}: Props) {
  return (
    <>
      {/* ── Action Control Bar ── */}
      <div className="p-4 border-b border-gray-100 bg-gray-50/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {availabilityBadge}
          {isLocked ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
              <Lock className="h-3.5 w-3.5 text-blue-600" />
              Locked by {lockedByWarehouseName ?? 'Warehouse'} {lockedByUsername ? `(${lockedByUsername})` : ''}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-white border border-gray-200 px-2.5 py-1 rounded-lg">
              <Unlock className="h-3.5 w-3.5 text-slate-500" />
              Unlocked (Global Pool)
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Reopen Order Button if Cancelled */}
          {canReopen && (
            <button
              type="button"
              disabled={isActionPending}
              onClick={() => onStatusChange('pending')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              title="Reinstate cancelled order back to Pending status"
            >
              ↺ Reopen Order (Make Pending)
            </button>
          )}

          {/* Lock / Release Controls */}
          {isLocked ? (
            canRelease ? (
              <button
                type="button"
                disabled={isActionPending}
                onClick={() => onUnlock(orderId)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                title="Release lock on pending order to return to global pool"
              >
                <Unlock className="h-3.5 w-3.5 text-gray-500" /> Release Lock
              </button>
            ) : null
          ) : null}

          {/* Confirm Order Button */}
          {isLockedByMyWarehouse && status === 'pending' && (
            <button
              type="button"
              disabled={isActionPending}
              onClick={() => onConfirm(orderId)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle className="h-3.5 w-3.5" /> Confirm Order
            </button>
          )}

          {/* Cancel Order Button */}
          {canCancel && (
            <button
              type="button"
              disabled={isActionPending}
              onClick={() => {
                if (
                  window.confirm(
                    `Are you sure you want to cancel Order #${orderId}? Reserved inventory will be released.`
                  )
                ) {
                  onCancel(orderId);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 cursor-pointer"
            >
              <XCircle className="h-3.5 w-3.5" /> Cancel Order
            </button>
          )}

          {/* Assign Customer Due */}
          {hasCustomerId && onOpenDueModal && (
            <button
              type="button"
              onClick={onOpenDueModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 cursor-pointer"
            >
              <CreditCard className="h-3.5 w-3.5 text-amber-700" /> Assign Due
            </button>
          )}
        </div>
      </div>

      {/* ── Status Transition Radio Selector ── */}
      <div className="px-6 py-4 bg-slate-50 border-b border-gray-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                Order Status Transition Control
              </span>
              {status === 'cancelled' && (
                canReopen ? (
                  <span className="rounded-md bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold">
                    Cancelled by {updatedByUsername ?? 'Warehouse'} (Can Reopen)
                  </span>
                ) : (
                  <span className="rounded-md bg-gray-200 text-gray-600 px-2 py-0.5 text-[10px] font-bold">
                    Cancelled by Customer
                  </span>
                )
              )}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {status === 'cancelled'
                ? canReopen
                  ? 'This order was cancelled by warehouse staff. Select "Pending" or click Reopen to reinstate it.'
                  : 'This order was cancelled by the customer.'
                : isLockedByMyWarehouse
                ? 'Select a status below to update order progress:'
                : '⚠️ Order must be locked by your warehouse to change its status.'}
            </p>
          </div>

          {/* Status Segmented Radio / Selector */}
          <div className="flex flex-wrap gap-1.5 items-center">
            {STATUS_OPTIONS.map((option) => {
              const isCurrent = status === option.value;
              const isReopenOption = status === 'cancelled' && option.value === 'pending' && canReopen;
              const isDisabled =
                isActionPending ||
                (status === 'cancelled' ? !isReopenOption : !isLockedByMyWarehouse);

              return (
                <label
                  key={option.value}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer select-none ${
                    isCurrent
                      ? option.value === 'cancelled'
                        ? 'bg-red-600 text-white shadow-xs'
                        : option.value === 'delivered'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-blue-600 text-white shadow-xs'
                      : isReopenOption
                      ? 'bg-amber-50 text-amber-800 border-2 border-amber-400 hover:bg-amber-100 shadow-xs'
                      : isDisabled
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="radio"
                    name={`order-status-${orderId}`}
                    value={option.value}
                    checked={isCurrent}
                    disabled={isDisabled}
                    onChange={() => onStatusChange(option.value)}
                    className="sr-only"
                  />
                  <span>
                    {isReopenOption ? '↺ Reopen (Pending)' : option.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
