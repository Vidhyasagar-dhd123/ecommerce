import {
  Boxes,
  Warehouse,
  AlertTriangle,
  ArrowLeftRight,
  Truck,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import type { WarehouseStats, InventoryTab } from '../model/inventoryTypes';

interface Props {
  warehouseName: string;
  warehouseId: number | null;
  employeeCode?: string;
  username?: string;
  stats?: WarehouseStats;
  activeTab: InventoryTab;
  onTabChange: (tab: InventoryTab) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function InventoryHeader({
  warehouseName,
  warehouseId,
  employeeCode = 'EMP-INV',
  stats,
  activeTab,
  onTabChange,
  onRefresh,
  isRefreshing,
}: Props) {
  return (
    <div className="space-y-5">
      {/* ── Page Hero Header Card ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-white p-6 shadow-xs border border-gray-100">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
            <Boxes className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Inventory Command Center
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                Inventory Manager
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 border border-gray-200">
                <Warehouse className="h-3 w-3 text-gray-500" />
                {warehouseName}
                {warehouseId && ` (#${warehouseId})`}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Facility stock levels, inter-warehouse inventory exchange, vendor procurement, and audit logs.
            </p>
          </div>
        </div>

        {/* Refresh button */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 transition-all cursor-pointer"
            title="Refresh Warehouse Data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : 'text-gray-400'}`} />
            <span>Sync Live</span>
          </button>
        </div>
      </div>

      {/* ── 4 KPI Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Stock Units */}
        <div className="rounded-2xl bg-white p-5 border border-gray-100 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <span>Total Units In Stock</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Boxes className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-gray-900 tracking-tight font-mono">
            {stats ? stats.total_stock.toLocaleString() : '—'}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Available: <strong className="text-emerald-600">{stats ? stats.total_available : '—'}</strong></span>
            <span>Reserved: <strong className="text-amber-600">{stats ? stats.total_reserved : '—'}</strong></span>
          </div>
        </div>

        {/* Card 2: Low Stock Alerts */}
        <div className="rounded-2xl bg-white p-5 border border-gray-100 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <span>Reorder Alerts</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-amber-600 tracking-tight font-mono">
            {stats ? stats.reorder_alerts_count : '0'}
          </div>
          <p className="mt-1 text-xs text-gray-400">
            {stats && stats.reorder_alerts_count > 0 ? 'SKUs at or below reorder threshold' : 'All SKUs adequately stocked'}
          </p>
        </div>

        {/* Card 3: Cataloged SKUs */}
        <div className="rounded-2xl bg-white p-5 border border-gray-100 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <span>Cataloged SKUs</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Warehouse className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-gray-900 tracking-tight font-mono">
            {stats ? stats.total_skus : '—'}
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Active product variants in station
          </p>
        </div>

        {/* Card 4: Vendor Imports */}
        <div className="rounded-2xl bg-white p-5 border border-gray-100 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <span>Inbound Vendor Goods</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-emerald-600 tracking-tight font-mono">
            {stats ? stats.pending_imports_count : '0'}
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Shipments awaiting physical receipt
          </p>
        </div>
      </div>

      {/* ── Navigation Tab Bar (matching customer orders/products tab style) ── */}
      <nav
        role="tablist"
        aria-label="Inventory manager navigation tabs"
        className="flex gap-1.5 overflow-x-auto rounded-2xl bg-white p-1.5 border border-gray-100 shadow-xs"
      >
        <button
          type="button"
          onClick={() => onTabChange('inventory')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
            activeTab === 'inventory'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Boxes className="h-3.5 w-3.5" />
          <span>Warehouse Inventory</span>
          {stats && stats.reorder_alerts_count > 0 && (
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
              activeTab === 'inventory' ? 'bg-blue-700 text-white' : 'bg-amber-100 text-amber-800'
            }`}>
              {stats.reorder_alerts_count}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onTabChange('transfers')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
            activeTab === 'transfers'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          <span>Inter-Warehouse Transfers</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('vendors')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
            activeTab === 'vendors'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Truck className="h-3.5 w-3.5" />
          <span>Vendors & Inbound Imports</span>
          {stats && stats.pending_imports_count > 0 && (
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
              activeTab === 'vendors' ? 'bg-blue-700 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {stats.pending_imports_count}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onTabChange('audit')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
            activeTab === 'audit'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Stock Audit Log</span>
        </button>
      </nav>
    </div>
  );
}
