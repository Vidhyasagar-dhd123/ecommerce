import type { AuthUser } from '../model/types';

/**
 * Returns the appropriate dashboard path based on the user's role and designation.
 * The 4 admin/staff roles:
 * 1. Admin -> /admin/dashboard
 * 2. Inventory Manager -> /inventory/dashboard
 * 3. Support Agent -> /support/dashboard
 * 4. Shipping Executive -> /shipping/dashboard
 * Customer -> /products
 */
export function getDashboardRoute(user?: AuthUser | null): string {
  if (!user) return '/login';

  const role = user.role?.toLowerCase();
  const designation = user.designation;

  if (role === 'admin') {
    return '/admin/dashboard';
  }

  if (role === 'employee') {
    if (designation === 'InventoryManager' || designation === 'inventory_manager') {
      return '/inventory/dashboard';
    }
    if (designation === 'SupportAgent' || designation === 'support_agent') {
      return '/support/dashboard';
    }
    if (designation === 'ShippingExecutive' || designation === 'shipping_executive') {
      return '/shipping/dashboard';
    }
    return '/inventory/dashboard';
  }

  return '/products';
}
