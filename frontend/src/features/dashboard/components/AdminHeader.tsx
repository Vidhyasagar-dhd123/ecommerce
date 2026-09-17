import {
  Users,
  ShoppingBag,
  Package,
  Layers,
  RotateCcw,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import type { AdminDashboardTab } from '../hooks/useAdminDashboard';

interface AdminHeaderProps {
  activeTab: AdminDashboardTab;
  onTabChange: (tab: AdminDashboardTab) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function AdminHeader({
  activeTab,
  onTabChange,
  onRefresh,
  isRefreshing,
}: AdminHeaderProps) {
  const tabs: { id: AdminDashboardTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'System Overview', icon: <Layers className="h-4 w-4" /> },
    { id: 'users', label: 'User Governance', icon: <Users className="h-4 w-4" /> },
    { id: 'orders', label: 'Order Workflows', icon: <Package className="h-4 w-4" /> },
    { id: 'catalog', label: 'Catalog & Stock', icon: <ShoppingBag className="h-4 w-4" /> },
    { id: 'returns', label: 'Returns & Refunds', icon: <RotateCcw className="h-4 w-4" /> },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Brand & Superuser Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                ShopEase Superuser Command Center
              </h1>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                Superuser Admin
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Manage platform-wide users, orders, catalog, logistics, inventory, and Django models.
            </p>
          </div>
        </div>

        {/* Action Controls & External Link */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>

          <a
            href="http://localhost:8000/admin/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Django Admin Portal
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </a>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mt-5 flex gap-2 overflow-x-auto border-t border-slate-100 pt-3">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
