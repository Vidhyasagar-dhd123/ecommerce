import { useAuth } from '@/features/auth/hooks/useAuth';
import { LogOut, User } from 'lucide-react';

interface DashboardSkeletonProps {
  title: string;
  roleBadge: string;
  description: string;
}

export const DashboardSkeleton = ({ title, roleBadge, description }: DashboardSkeletonProps) => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              <span className="rounded-full bg-blue-100 px-3 py-0.5 text-xs font-semibold text-blue-700">
                {roleBadge}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                <User className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <p className="font-medium leading-none">{user?.username ?? 'User'}</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
            </div>

            <button
              onClick={() => void logout()}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </header>

        <main className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <h2 className="text-lg font-semibold text-gray-800">Dashboard Skeleton Ready</h2>
          <p className="mt-2 text-sm text-gray-500">
            Authenticated as <span className="font-medium text-gray-800">{user?.role}</span>
            {user?.designation ? ` (${user.designation})` : ''}.
          </p>
        </main>
      </div>
    </div>
  );
};
