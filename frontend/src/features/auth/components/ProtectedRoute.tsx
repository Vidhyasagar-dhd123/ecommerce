import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { getDashboardRoute } from '@/features/auth/utils/roleGuards';
import type { UserRole, EmployeeDesignation } from '@/features/auth/model/types';

interface ProtectedRouteProps {
  allowedRoles?: (UserRole | string)[];
  allowedDesignations?: (EmployeeDesignation | string)[];
}

export const ProtectedRoute = ({
  allowedRoles,
  allowedDesignations,
}: ProtectedRouteProps) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Check role permissions if specified
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user.role?.toLowerCase() ?? 'customer';
    const isAllowed = allowedRoles.some((r) => r.toLowerCase() === userRole);
    if (!isAllowed) {
      return <Navigate to={getDashboardRoute(user)} replace />;
    }
  }

  // Check designation permissions if specified
  if (allowedDesignations && allowedDesignations.length > 0) {
    const userDesignation = user.designation;
    const isAllowed = allowedDesignations.some((d) => d === userDesignation);
    if (!isAllowed) {
      return <Navigate to={getDashboardRoute(user)} replace />;
    }
  }

  return <Outlet />;
};

