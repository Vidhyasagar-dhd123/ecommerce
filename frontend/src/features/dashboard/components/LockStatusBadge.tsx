import { Lock, Unlock, ShieldAlert } from 'lucide-react';

interface Props {
  isLocked?: boolean;
  lockedByWarehouseName?: string | null;
  lockedByUsername?: string | null;
  currentWarehouseId?: number | null;
  orderWarehouseId?: number | null;
}

export function LockStatusBadge({
  isLocked,
  lockedByWarehouseName,
  lockedByUsername,
  currentWarehouseId,
  orderWarehouseId,
}: Props) {
  if (!isLocked) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
        <Unlock className="h-3 w-3 text-slate-500" />
        Unlocked (Global Feed)
      </span>
    );
  }

  const isLockedToMe =
    Boolean(currentWarehouseId && orderWarehouseId && currentWarehouseId === orderWarehouseId);

  if (isLockedToMe) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-bold text-blue-700 shadow-xs">
        <Lock className="h-3 w-3 text-blue-600" />
        Locked by Your Warehouse {lockedByUsername ? `(${lockedByUsername})` : ''}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 border border-purple-200 px-2.5 py-0.5 text-xs font-bold text-purple-700">
      <ShieldAlert className="h-3 w-3 text-purple-600" />
      Locked by {lockedByWarehouseName ?? 'Warehouse'}
    </span>
  );
}
