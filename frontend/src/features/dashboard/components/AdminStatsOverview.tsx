import {
  Users,
  DollarSign,
  PackageCheck,
  AlertTriangle,
  RotateCcw,
  Tag,
  ArrowUpRight,
  Database,
  Building2,
  Truck,
} from 'lucide-react';
import type { AdminStats } from '../model/adminTypes';

interface AdminStatsOverviewProps {
  stats?: AdminStats;
  isLoading: boolean;
  onNavigateTab: (tab: any) => void;
}

export function AdminStatsOverview({
  stats,
  isLoading,
  onNavigateTab,
}: AdminStatsOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-200" />
        ))}
      </div>
    );
  }

  const kpis = [
    {
      title: 'Total Revenue',
      value: `$${(stats?.orders.revenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: `${stats?.orders.delivered ?? 0} orders delivered`,
      icon: <DollarSign className="h-5 w-5 text-emerald-600" />,
      bg: 'bg-emerald-50 text-emerald-700',
    },
    {
      title: 'Platform Users',
      value: (stats?.users.total ?? 0).toLocaleString(),
      subtitle: `${stats?.users.customers ?? 0} Customers · ${stats?.users.employees ?? 0} Staff`,
      icon: <Users className="h-5 w-5 text-blue-600" />,
      bg: 'bg-blue-50 text-blue-700',
      action: () => onNavigateTab('users'),
    },
    {
      title: 'Total Orders',
      value: (stats?.orders.total ?? 0).toLocaleString(),
      subtitle: `${stats?.orders.pending ?? 0} Pending · ${stats?.orders.confirmed ?? 0} In Flow`,
      icon: <PackageCheck className="h-5 w-5 text-indigo-600" />,
      bg: 'bg-indigo-50 text-indigo-700',
      action: () => onNavigateTab('orders'),
    },
    {
      title: 'Catalog SKUs',
      value: (stats?.inventory.variants ?? 0).toLocaleString(),
      subtitle: `${stats?.inventory.products ?? 0} Base Products`,
      icon: <Database className="h-5 w-5 text-violet-600" />,
      bg: 'bg-violet-50 text-violet-700',
      action: () => onNavigateTab('catalog'),
    },
    {
      title: 'Low Stock Alerts',
      value: (stats?.inventory.low_stock ?? 0).toLocaleString(),
      subtitle: `${stats?.inventory.out_of_stock ?? 0} Out of Stock`,
      icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
      bg: 'bg-amber-50 text-amber-700',
      action: () => onNavigateTab('catalog'),
    },
    {
      title: 'Pending Returns',
      value: (stats?.operations.pending_returns ?? 0).toLocaleString(),
      subtitle: 'Awaiting inspection/approval',
      icon: <RotateCcw className="h-5 w-5 text-rose-600" />,
      bg: 'bg-rose-50 text-rose-700',
      action: () => onNavigateTab('returns'),
    },
  ];

  const adminShortcuts = [
    {
      title: 'User & Staff Roles',
      desc: 'Create staff, manage groups & permissions',
      url: 'http://localhost:8000/admin/users/user/',
      icon: <Users className="h-5 w-5 text-blue-600" />,
    },
    {
      title: 'Product Catalog & Media',
      desc: 'Add products, upload gallery images, manage SKUs',
      url: 'http://localhost:8000/admin/products/product/',
      icon: <Database className="h-5 w-5 text-violet-600" />,
    },
    {
      title: 'Orders & Payments',
      desc: 'View order lifecycle, payments & invoices',
      url: 'http://localhost:8000/admin/orders/order/',
      icon: <PackageCheck className="h-5 w-5 text-indigo-600" />,
    },
    {
      title: 'Shipments & Logistics',
      desc: 'Track carrier dispatches and delivery timelines',
      url: 'http://localhost:8000/admin/fulfillment/shipment/',
      icon: <Truck className="h-5 w-5 text-emerald-600" />,
    },
    {
      title: 'Warehouses & Stock Ledger',
      desc: 'Multi-warehouse stock levels and audit ledger',
      url: 'http://localhost:8000/admin/inventory/inventory/',
      icon: <Building2 className="h-5 w-5 text-sky-600" />,
    },
    {
      title: 'Promotions & Coupons',
      desc: 'Create discount vouchers and special offers',
      url: 'http://localhost:8000/admin/promotions/coupon/',
      icon: <Tag className="h-5 w-5 text-pink-600" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            onClick={kpi.action}
            className={`flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md ${
              kpi.action ? 'cursor-pointer hover:border-slate-300' : ''
            }`}
          >
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500">{kpi.title}</span>
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {kpi.value}
              </div>
              <p className="text-xs text-slate-500">{kpi.subtitle}</p>
            </div>
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${kpi.bg}`}>
              {kpi.icon}
            </div>
          </div>
        ))}
      </div>

      {/* ── Django Admin Fast Launchers ── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Django Admin Model Workflows
            </h2>
            <p className="text-xs text-slate-500">
              Direct links to high-level model control and low-level data overrides in the customized Django Admin.
            </p>
          </div>
          <a
            href="http://localhost:8000/admin/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            All 15 Models
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {adminShortcuts.map((item, idx) => (
            <a
              key={idx}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3.5 rounded-xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:border-blue-200 hover:bg-blue-50/40"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-xs group-hover:scale-105 transition">
                {item.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600">
                    {item.title}
                  </h3>
                  <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600" />
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                  {item.desc}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
