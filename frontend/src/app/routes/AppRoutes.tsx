import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from '@features/auth/components/ProtectedRoute';
import { Login } from '@/pages/Login/Login';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getDashboardRoute } from '@/features/auth/utils/roleGuards';
import { DashboardSkeleton } from '@/pages/Dashboards/DashboardSkeleton';

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

        {/* ── Admin Dashboard Skeleton ────────────────────────── */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route
            path="/admin/dashboard"
            element={
              <DashboardSkeleton
                title="System Admin Dashboard"
                roleBadge="System Admin"
                description="Manage users, employees, system logs, and global configuration."
              />
            }
          />
        </Route>

        {/* ── Inventory Manager Dashboard Skeleton ───────────── */}
        <Route
          element={
            <ProtectedRoute
              allowedRoles={['admin', 'employee']}
              allowedDesignations={['InventoryManager']}
            />
          }
        >
          <Route
            path="/inventory/dashboard"
            element={
              <DashboardSkeleton
                title="Inventory Manager Dashboard"
                roleBadge="Inventory Manager"
                description="Manage warehouses, stock movements, products, and inventory audits."
              />
            }
          />
        </Route>

        {/* ── Support Agent Dashboard Skeleton ───────────────── */}
        <Route
          element={
            <ProtectedRoute
              allowedRoles={['admin', 'employee']}
              allowedDesignations={['SupportAgent']}
            />
          }
        >
          <Route
            path="/support/dashboard"
            element={
              <DashboardSkeleton
                title="Support Agent Dashboard"
                roleBadge="Support Agent"
                description="Manage customer returns, exchange requests, ticket resolution, and support inquiries."
              />
            }
          />
        </Route>

        {/* ── Shipping Executive Dashboard Skeleton ──────────── */}
        <Route
          element={
            <ProtectedRoute
              allowedRoles={['admin', 'employee']}
              allowedDesignations={['ShippingExecutive']}
            />
          }
        >
          <Route
            path="/shipping/dashboard"
            element={
              <DashboardSkeleton
                title="Shipping Executive Dashboard"
                roleBadge="Shipping Executive"
                description="Manage order fulfillment, shipments, dispatches, and delivery status tracking."
              />
            }
          />
        </Route>

        {/* ── Customer Protected Routes ───────────────────────── */}
        <Route element={<ProtectedRoute allowedRoles={['customer', 'admin']} />}>
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

        {/* Fallback */}
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </Suspense>
  );
};

