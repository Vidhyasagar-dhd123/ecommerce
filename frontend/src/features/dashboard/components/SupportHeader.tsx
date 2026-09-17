import {
  Headset,
  Building2,
  Layers,
  RefreshCw,
  ShieldCheck,
  Warehouse,
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface Props {
  activeTab: 'incoming-orders' | 'inventory-query';
  onTabChange: (tab: 'incoming-orders' | 'inventory-query') => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  totalOrdersCount: number;
}

export function SupportHeader({
  activeTab,
  onTabChange,
  onRefresh,
  isRefreshing,
  totalOrdersCount,
}: Props) {
  const { user } = useAuth();
  const employeeWarehouse =
    user?.warehouseName ??
    (user as any)?.employee_profile?.warehouse_name ??
    (user as any)?.warehouse_name ??
    'Assigned Warehouse';
  const warehouseId = user?.warehouseId || (user as any)?.employee_profile?.warehouse_id;

  return (
    <div className="space-y-5">
      {/* ── Page Hero Header Card ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-white p-6 shadow-xs border border-gray-100">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
            <Headset className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Support Agent Command Center
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                Support Agent
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 border border-gray-200">
                <Warehouse className="h-3 w-3 text-gray-500" />
                {employeeWarehouse}
                {warehouseId && ` (#${warehouseId})`}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Live global order feed, warehouse locking & dispatch assignment, customer due limits, and stock inquiries.
            </p>
          </div>
        </div>

        {/* Sync Live Button */}
        <div className="flex items-center gap-2.5 self-end sm:self-center">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 transition-all cursor-pointer"
            title="Refresh order feed"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : 'text-gray-400'}`} />
            <span>Sync Live</span>
          </button>
        </div>
      </div>

      {/* ── Navigation Tabs (matching customer orders tab styling) ── */}
      <nav
        role="tablist"
        aria-label="Support desk tabs"
        className="flex gap-1.5 overflow-x-auto rounded-2xl bg-white p-1.5 border border-gray-100 shadow-xs"
      >
        <button
          type="button"
          onClick={() => onTabChange('incoming-orders')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
            activeTab === 'incoming-orders'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Headset className="h-3.5 w-3.5" />
          <span>Incoming Orders Feed</span>
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
              activeTab === 'incoming-orders'
                ? 'bg-blue-700 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {totalOrdersCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('inventory-query')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
            activeTab === 'inventory-query'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Warehouse & Variant Stock Inquiries</span>
        </button>
      </nav>
    </div>
  );
}
