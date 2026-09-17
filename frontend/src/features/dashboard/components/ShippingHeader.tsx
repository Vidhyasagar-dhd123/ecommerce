import {
  RefreshCw,
  Truck,
  CheckCircle2,
  Clock,
  RotateCcw,
  Package,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { ShippingFilterCounts, ShippingStatusFilter } from '../model/shippingTypes';

interface Props {
  counts: ShippingFilterCounts;
  currentFilter: ShippingStatusFilter;
  onFilterChange: (f: ShippingStatusFilter) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function ShippingHeader({
  counts,
  currentFilter,
  onFilterChange,
  onRefresh,
  isRefreshing,
}: Props) {
  const { user } = useAuth();
  const warehouseName =
    user?.warehouseName ||
    (user as any)?.employee_profile?.warehouse_name ||
    (user as any)?.warehouse_name ||
    'Assigned Warehouse';
  const warehouseId = user?.warehouseId || (user as any)?.employee_profile?.warehouse_id;

  return (
    <div className="space-y-5">
      {/* ── Top Hero Card ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-white p-6 shadow-xs border border-gray-100">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Shipping & Fulfillment Hub
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                Shipping Executive
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 border border-gray-200">
                <Building2 className="h-3 w-3 text-gray-500" />
                {warehouseName}
                {warehouseId && ` (#${warehouseId})`}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Dispatch orders locked to this facility, generate shipping labels, and record package deliveries.
            </p>
          </div>
        </div>

        {/* Refresh Sync Button */}
        <div className="flex items-center gap-2.5 self-end sm:self-center">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 transition-all cursor-pointer"
            title="Refresh Orders"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : 'text-gray-400'}`} />
            <span>Sync Live</span>
          </button>
        </div>
      </div>

      {/* ── KPI Filter Cards (matching customer aesthetic) ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {/* Total Orders */}
        <button
          type="button"
          onClick={() => onFilterChange('')}
          className={`flex flex-col rounded-2xl p-4 border text-left transition-all cursor-pointer ${
            currentFilter === ''
              ? 'bg-blue-50/60 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <span>All Assigned</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Package className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-gray-900 font-mono tracking-tight">{counts.all}</div>
          <span className="text-[11px] text-gray-400 mt-0.5">Facility orders</span>
        </button>

        {/* Ready to Ship (Confirmed) */}
        <button
          type="button"
          onClick={() => onFilterChange('confirmed')}
          className={`flex flex-col rounded-2xl p-4 border text-left transition-all cursor-pointer ${
            currentFilter === 'confirmed'
              ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-amber-700 uppercase tracking-wider">
            <span>Ready to Ship</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700 font-mono tracking-tight">{counts.confirmed}</div>
          <span className="text-[11px] text-amber-600 font-medium mt-0.5">Awaiting dispatch</span>
        </button>

        {/* In Transit (Shipped) */}
        <button
          type="button"
          onClick={() => onFilterChange('shipped')}
          className={`flex flex-col rounded-2xl p-4 border text-left transition-all cursor-pointer ${
            currentFilter === 'shipped'
              ? 'bg-purple-50/60 border-purple-300 ring-2 ring-purple-500/20 shadow-xs'
              : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-purple-700 uppercase tracking-wider">
            <span>In Transit</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <Truck className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-purple-700 font-mono tracking-tight">{counts.shipped}</div>
          <span className="text-[11px] text-purple-600 font-medium mt-0.5">On the road</span>
        </button>

        {/* Delivered */}
        <button
          type="button"
          onClick={() => onFilterChange('delivered')}
          className={`flex flex-col rounded-2xl p-4 border text-left transition-all cursor-pointer ${
            currentFilter === 'delivered'
              ? 'bg-emerald-50/60 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            <span>Delivered</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700 font-mono tracking-tight">{counts.delivered}</div>
          <span className="text-[11px] text-emerald-600 font-medium mt-0.5">Completed</span>
        </button>

        {/* Returned */}
        <button
          type="button"
          onClick={() => onFilterChange('returned')}
          className={`flex flex-col rounded-2xl p-4 border text-left transition-all cursor-pointer col-span-2 sm:col-span-1 ${
            currentFilter === 'returned'
              ? 'bg-rose-50/60 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
              : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-rose-700 uppercase tracking-wider">
            <span>Returned</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <RotateCcw className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-700 font-mono tracking-tight">{counts.returned}</div>
          <span className="text-[11px] text-rose-600 font-medium mt-0.5">RTO / returned</span>
        </button>
      </div>
    </div>
  );
}
