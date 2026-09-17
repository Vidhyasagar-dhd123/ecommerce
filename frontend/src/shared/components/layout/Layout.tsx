import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { useWishlist } from '@/features/orders/hooks/useOrders';
import { useUIStore } from '@/shared/store/uiStore';
import { useAuth } from '@/features/auth/hooks/useAuth';

/**
 * Main application shell used as a react-router layout route.
 * Place this as the element of a parent <Route> that wraps all
 * authenticated child routes — child routes render via <Outlet />.
 *
 * Background colour uses the --color-bg design token defined in theme.css.
 */
export function Layout() {
  const { user } = useAuth();
  const isCustomer = !user || user.role === 'customer';
  const { data: wishlist } = useWishlist({ enabled: isCustomer });
  const { syncWishlistIds } = useUIStore();

  useEffect(() => {
    if (isCustomer && wishlist?.items) {
      syncWishlistIds(wishlist.items.map((i) => i.product.id));
    }
  }, [wishlist, syncWishlistIds, isCustomer]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <Navbar />
      <main className="">
        <Outlet />
      </main>
    </div>
  );
}
