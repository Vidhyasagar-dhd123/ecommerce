import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from '@features/auth/components/ProtectedRoute';
import { Login } from '@/pages/Login/Login';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getDashboardRoute } from '@/features/auth/utils/roleGuards';
import { DashboardSkeleton } from '@/pages/Dashboards/DashboardSkeleton';
import { Layout } from '@/shared/components/layout/Layout';

// ── Code-split all pages ──────────────────────────────────
const ProductsPage       = lazy(() => import('@/pages/Products/ProductsPage'));
const ProductDetailPage  = lazy(() => import('@features/products/pages/ProductDetailPage'));
const CartPage           = lazy(() => import('@features/cart/pages/CartPage'));
const CheckoutPage       = lazy(() => import('@features/checkout/pages/CheckoutPage'));
const OrderListPage      = lazy(() => import('@features/orders/pages/OrderListPage'));
const OrderDetailPage    = lazy(() => import('@features/orders/pages/OrderDetailPage'));
const OrderTrackPage     = lazy(() => import('@features/orders/pages/OrderTrackPage'));
const HistoryPage        = lazy(() => import('@features/history/pages/HistoryPage'));
const InvoicePage        = lazy(() => import('@features/invoices/pages/InvoicePage'));
const RequestReturnPage  = lazy(() => import('@features/fulfillment/pages/RequestReturnPage'));
const DuesPage           = lazy(() => import('@features/finance/pages/DuesPage'));
const PromotionsPage     = lazy(() => import('@features/promotions/pages/PromotionsPage'));
const WishlistPage       = lazy(() => import('@features/wishlist/pages/WishlistPage'));
const ProfilePage        = lazy(() => import('@features/profile/pages/ProfilePage'));
const AddressPage        = lazy(() => import('@features/profile/pages/AddressPage'));
const AdminDashboardPage = lazy(() =>
  import('@features/dashboard/pages/AdminDashboardPage').then((m) => ({
    default: m.AdminDashboardPage,
  }))
);
const SupportAgentDashboardPage = lazy(() =>
  import('@features/dashboard/pages/SupportAgentDashboardPage').then((m) => ({
    default: m.SupportAgentDashboardPage,
  }))
);
const ShippingExecutiveDashboardPage = lazy(() =>
  import('@features/dashboard/pages/ShippingExecutiveDashboardPage').then((m) => ({
    default: m.ShippingExecutiveDashboardPage,
  }))
);
const InventoryManagerDashboardPage = lazy(() =>
  import('@features/dashboard/pages/InventoryManagerDashboardPage').then((m) => ({
    default: m.InventoryManagerDashboardPage,
  }))
);

// ── Spinner shown during route lazy-load ─────────────────
function PageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
    </div>
  );
}

// ── Root Redirect ─────────────────────────────────────────
function RootRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageSpinner />;
  if (isAuthenticated && user) {
    return <Navigate to={getDashboardRoute(user)} replace />;
  }
  return <Navigate to="/login" replace />;
}

export const AppRoutes = () => {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        {/* Public & Root */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />

        {/* ── Admin Dashboard ────────────────────────────────── */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route element={<Layout />}>
            <Route
              path="/admin/dashboard"
              element={<AdminDashboardPage />}
            />
          </Route>
        </Route>


        {/* ── Inventory Manager Dashboard ─────────────────────── */}
        <Route
          element={
            <ProtectedRoute
              allowedRoles={['admin', 'employee']}
              allowedDesignations={['InventoryManager']}
            />
          }
        >
          <Route element={<Layout />}>
            <Route
              path="/inventory/dashboard"
              element={<InventoryManagerDashboardPage />}
            />
          </Route>
        </Route>

        {/* ── Support Agent Dashboard ────────────────────────── */}
        <Route
          element={
            <ProtectedRoute
              allowedRoles={['admin', 'employee']}
              allowedDesignations={['SupportAgent']}
            />
          }
        >
          <Route element={<Layout />}>
            <Route
              path="/support/dashboard"
              element={<SupportAgentDashboardPage />}
            />
          </Route>
        </Route>

        {/* ── Shipping Executive Dashboard ──────────────────── */}
        <Route
          element={
            <ProtectedRoute
              allowedRoles={['admin', 'employee']}
              allowedDesignations={['ShippingExecutive']}
            />
          }
        >
          <Route element={<Layout />}>
            <Route
              path="/shipping/dashboard"
              element={<ShippingExecutiveDashboardPage />}
            />
          </Route>
        </Route>

        {/* ── Customer Protected Routes ───────────────────────── */}
        {/* Layout route: renders Navbar once; child pages fill the <Outlet /> */}
        <Route element={<ProtectedRoute allowedRoles={['customer', 'admin']} />}>
          <Route element={<Layout />}>
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:slug" element={<ProductDetailPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/orders" element={<OrderListPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/orders/:id/track" element={<OrderTrackPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/invoices/:orderId" element={<InvoicePage />} />
            <Route path="/orders/:id/return" element={<RequestReturnPage />} />
            <Route path="/dues" element={<DuesPage />} />
            <Route path="/promotions" element={<PromotionsPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/addresses" element={<AddressPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </Suspense>
  );
};

