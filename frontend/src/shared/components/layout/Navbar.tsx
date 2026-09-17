import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  ShoppingCart, Heart, Package, LayoutDashboard,
  ChevronDown, LogOut, User, Menu, X, Search, Warehouse,
} from 'lucide-react';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUIStore } from '@/shared/store/uiStore';
import { getDashboardRoute } from '@/features/auth/utils/roleGuards';

const CUSTOMER_NAV_LINKS = [
  { to: '/products', label: 'Products' },
  { to: '/orders',   label: 'Orders'   },
  { to: '/wishlist', label: 'Wishlist' },
  { to: '/dues',     label: 'Dues'     },
];

/** Reusable active-aware desktop link */
function DesktopLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'relative px-1 py-1 text-sm font-medium transition-colors duration-150',
          'after:absolute after:inset-x-0 after:-bottom-1 after:h-[2px] after:rounded-full after:transition-all after:duration-200',
          isActive
            ? 'text-[var(--color-primary)] font-semibold after:bg-[var(--color-primary)] after:scale-x-100'
            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] after:bg-[var(--color-primary)] after:scale-x-0 hover:after:scale-x-100',
        ].join(' ')
      }
    >
      {label}
    </NavLink>
  );
}

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { cartCount } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen]   = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [navSearch, setNavSearch]     = useState('');
  const profileRef = useRef<HTMLDivElement>(null);

  const isEmployee = user?.role === 'employee';
  const designation =
    (user as any)?.designation ||
    (user as any)?.employee_profile?.designation ||
    (user as any)?.employeeProfile?.designation;

  const employeeWarehouse =
    user?.warehouseName ||
    (user as any)?.employee_profile?.warehouse_name ||
    (user as any)?.warehouse_name;

  const dashboardRoute = user ? getDashboardRoute(user) : '/login';

  // Role-aware navigation links
  const navLinks = user?.role === 'admin'
    ? [
        { to: '/admin/dashboard', label: 'Admin Command' },
        { to: '/products', label: 'Products' },
        { to: '/orders', label: 'Orders' },
      ]
    : isEmployee
      ? designation === 'SupportAgent'
        ? [{ to: '/support/dashboard', label: 'Support Desk' }]
        : designation === 'ShippingExecutive'
          ? [{ to: '/shipping/dashboard', label: 'Dispatch Hub' }]
          : designation === 'InventoryManager'
            ? [{ to: '/inventory/dashboard', label: 'Inventory Hub' }]
            : [{ to: dashboardRoute, label: 'Dashboard' }]
      : CUSTOMER_NAV_LINKS;


  // Sync nav search with url search param if on /products
  useEffect(() => {
    if (location.pathname === '/products') {
      const params = new URLSearchParams(location.search);
      setNavSearch(params.get('search') ?? '');
    }
  }, [location.pathname, location.search]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const closeMobile = () => setMobileOpen(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (navSearch.trim()) {
      navigate(`/products?search=${encodeURIComponent(navSearch.trim())}`);
    } else if (location.pathname === '/products') {
      navigate('/products');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      /* silent */
    }
  };

  return (
    <>
      <nav
        className="fixed inset-x-0 top-0 z-50 h-[var(--navbar-height)] border-b bg-white/95 backdrop-blur shadow-sm transition-all"
        style={{
          borderColor: 'var(--navbar-border)',
        }}
        aria-label="Main navigation"
      >
        <div className="mx-auto flex h-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">

          {/* ── Brand Logo & Name (ShopEase) ── */}
          <Link
            to={isAuthenticated && user ? (isEmployee ? dashboardRoute : '/products') : '/login'}
            className="flex shrink-0 items-center gap-2 text-lg font-bold transition-opacity hover:opacity-90"
            aria-label="ShopEase home"
            style={{ color: 'var(--color-text)' }}
          >
            <ShoppingCart className="h-6 w-6" style={{ color: 'var(--color-primary)' }} />
            <span className="tracking-tight">ShopEase</span>
            {isEmployee && (
              <span className="hidden sm:inline-block rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase tracking-wider border border-blue-200">
                Staff
              </span>
            )}
          </Link>

          {/* ── Desktop Nav Links ── */}
          {isAuthenticated && (
            <div className="hidden lg:flex items-center gap-6 ml-2">
              {navLinks.map((l) => (
                <DesktopLink key={l.to} {...l} />
              ))}
            </div>
          )}

          {/* ── Global Search Bar (for customers only) ── */}
          {isAuthenticated && !isEmployee && (
            <form onSubmit={handleSearchSubmit} className="hidden sm:flex flex-1 max-w-md mx-2">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={navSearch}
                  onChange={(e) => setNavSearch(e.target.value)}
                  placeholder="Search products…"
                  aria-label="Search products"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                />
              </div>
            </form>
          )}

          {/* ── Spacer for smaller desktop / right-align ── */}
          <div className="flex-1" />

          {/* ── Desktop Action Icons & Profile ── */}
          {isAuthenticated ? (
            <div className="hidden sm:flex items-center gap-2.5">
              {/* Employee Facility Station Badge */}
              {isEmployee && employeeWarehouse && (
                <div className="flex items-center gap-1.5 rounded-full bg-blue-50/80 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200 shadow-xs">
                  <Warehouse className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span className="truncate max-w-[200px]">{employeeWarehouse}</span>
                </div>
              )}

              {/* Wishlist and Cart for customers only */}
              {!isEmployee && (
                <>
                  <Link
                    to="/wishlist"
                    aria-label="Wishlist"
                    className="relative flex h-9 w-9 items-center justify-center rounded-xl text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                  >
                    <Heart className="h-5 w-5" />
                  </Link>

                  <Link
                    to="/cart"
                    aria-label={`Cart — ${cartCount} items`}
                    className="relative flex h-9 w-9 items-center justify-center rounded-xl text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && (
                      <span
                        className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-sm"
                        style={{ background: 'var(--color-primary)' }}
                        aria-hidden="true"
                      >
                        {cartCount > 99 ? '99+' : cartCount}
                      </span>
                    )}
                  </Link>
                </>
              )}

              {/* Profile Dropdown */}
              <div ref={profileRef} className="relative ml-1">
                <button
                  id="profile-menu-button"
                  aria-haspopup="true"
                  aria-expanded={profileOpen}
                  aria-controls="profile-dropdown"
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-full p-1 pr-2.5 transition hover:bg-gray-100 border border-gray-200 cursor-pointer"
                >
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                    style={{
                      background: 'var(--color-primary-light)',
                      color: 'var(--color-primary)',
                    }}
                    aria-hidden="true"
                  >
                    {user?.username?.[0]?.toUpperCase() ?? 'U'}
                  </span>
                  <span className="text-xs font-semibold text-gray-800 max-w-[100px] truncate">
                    {user?.username}
                  </span>
                  <ChevronDown
                    className="h-3.5 w-3.5 text-gray-500 transition-transform duration-200"
                    style={{ transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  />
                </button>

                {/* Dropdown panel */}
                {profileOpen && (
                  <div
                    id="profile-dropdown"
                    role="menu"
                    aria-labelledby="profile-menu-button"
                    className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl border bg-white py-1 shadow-lg z-50 animate-in zoom-in-95 duration-150"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <div className="border-b px-4 py-3 bg-slate-50/50" style={{ borderColor: 'var(--color-border)' }}>
                      <p className="text-xs font-medium text-gray-400">Signed in as</p>
                      <p className="truncate text-sm font-semibold text-gray-800">
                        {user?.username}
                      </p>
                      {user?.role && (
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 capitalize border border-blue-200">
                            {user.role}
                          </span>
                          {designation && (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-700">
                              {designation}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {isEmployee ? (
                      <Link
                        to={dashboardRoute}
                        role="menuitem"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                      >
                        <LayoutDashboard className="h-4 w-4 text-gray-400" />
                        Workspace Dashboard
                      </Link>
                    ) : (
                      [
                        { to: '/profile',           icon: User,            label: 'Profile & Addresses' },
                        { to: '/orders',            icon: Package,         label: 'My Orders'           },
                        { to: '/wishlist',          icon: Heart,           label: 'Wishlist'            },
                        { to: dashboardRoute,       icon: LayoutDashboard, label: 'Dashboard'           },
                      ].map(({ to, icon: Icon, label }) => (
                        <Link
                          key={to}
                          to={to}
                          role="menuitem"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                        >
                          <Icon className="h-4 w-4 text-gray-400" />
                          {label}
                        </Link>
                      ))
                    )}

                    {user?.role === 'admin' && (
                      <a
                        href="http://localhost:8000/admin/"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
                      >
                        <span className="flex items-center gap-3">
                          <LayoutDashboard className="h-4 w-4 text-blue-600" />
                          Django Admin Portal
                        </span>
                        <span className="rounded bg-blue-100 px-1.5 py-0.2 text-[10px] font-bold text-blue-700">Deep</span>
                      </a>
                    )}


                    <div className="mt-1 border-t pt-1" style={{ borderColor: 'var(--color-border)' }}>
                      <button
                        role="menuitem"
                        onClick={() => { setProfileOpen(false); void handleLogout(); }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                to="/login"
                className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}
              >
                Create account
              </Link>
            </div>
          )}

          {/* ── Mobile Hamburger ── */}
          <div className="flex sm:hidden">
            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              className="rounded-xl p-2 text-gray-600 transition hover:bg-gray-100"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* ── Mobile Drawer ── */}
        {mobileOpen && (
          <div className="sm:hidden border-t bg-white shadow-lg" style={{ borderColor: 'var(--color-border)' }}>
            <div className="space-y-2 px-4 py-3">
              {/* Mobile Search */}
              {!isEmployee && (
                <form onSubmit={(e) => { handleSearchSubmit(e); closeMobile(); }} className="mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="search"
                      value={navSearch}
                      onChange={(e) => setNavSearch(e.target.value)}
                      placeholder="Search products…"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </form>
              )}

              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-3 px-2 py-2 border-b border-gray-100">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                      style={{
                        background: 'var(--color-primary-light)',
                        color: 'var(--color-primary)',
                      }}
                    >
                      {user?.username?.[0]?.toUpperCase() ?? 'U'}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{user?.username}</p>
                      <p className="text-xs text-gray-400 capitalize">
                        {user?.role} {designation ? `• ${designation}` : ''}
                      </p>
                    </div>
                  </div>

                  {navLinks.map(({ to, label }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={closeMobile}
                      className={({ isActive }) =>
                        `flex rounded-xl px-3 py-2 text-sm font-medium transition ${
                          isActive ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                        }`
                      }
                    >
                      {label}
                    </NavLink>
                  ))}

                  {!isEmployee && (
                    <NavLink
                      to="/cart"
                      onClick={closeMobile}
                      className="flex rounded-xl px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cart {cartCount > 0 ? `(${cartCount})` : ''}
                    </NavLink>
                  )}

                  <button
                    onClick={() => { closeMobile(); void handleLogout(); }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={closeMobile}
                  className="flex items-center justify-center rounded-xl py-2.5 text-sm font-semibold text-white"
                  style={{ background: 'var(--color-primary)' }}
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Spacer so content doesn't get hidden under fixed navbar */}
      <div style={{ height: 'var(--navbar-height)' }} aria-hidden="true" />
    </>
  );
}