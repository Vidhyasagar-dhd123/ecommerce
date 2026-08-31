import { useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Calendar, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

import { useMe, useUpdateProfile } from '../../orders/hooks/useOrders';
import { handleApiError } from '@utils/apiHelpers';
import { formatMonthYear } from '@utils/formatDate';

const profileSchema = z.object({
  username: z.string().min(3, 'Min 3 characters').max(30),
  email: z.string().email('Enter a valid email'),
  date_of_birth: z.string().optional(),
  gender: z.enum(['M', 'F', 'O', 'N']).optional(),
});
type ProfileForm = z.infer<typeof profileSchema>;

const GENDER_LABELS: Record<string, string> = {
  M: 'Male', F: 'Female', O: 'Other', N: 'Prefer not to say',
};

export default function ProfilePage() {
  const { data: user, isPending } = useMe();
  const updateMutation = useUpdateProfile();

  const { register, handleSubmit, reset, setError, formState: { errors, isDirty } } =
    useForm<ProfileForm>({ resolver: zodResolver(profileSchema) });

  // Populate form when data loads
  useEffect(() => {
    if (user) {
      reset({
        username: user.username,
        email: user.email,
        date_of_birth: user.customer_profile?.date_of_birth ?? '',
        gender: (user.customer_profile?.gender as ProfileForm['gender']) ?? undefined,
      });
    }
  }, [user, reset]);

  const joinedDate = useMemo(
    () => (user ? formatMonthYear(user.date_joined) : ''),
    [user],
  );

  const onSubmit = useCallback(
    (data: ProfileForm) => {
      updateMutation.mutate(data, {
        onError: (err) => handleApiError(err, setError, (msg) => toast.error(msg)),
      });
    },
    [updateMutation, setError],
  );

  if (isPending) {
    return (
      <div className="mx-auto max-w-2xl animate-pulse space-y-4 px-4 py-10">
        <div className="h-24 rounded-2xl bg-gray-200" />
        <div className="h-64 rounded-2xl bg-gray-200" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">My Profile</h1>

        {/* Avatar card */}
        <div className="mb-6 flex items-center gap-4 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-600">
            {user?.username?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="font-bold text-gray-800">{user?.username}</p>
            <p className="text-sm text-gray-400">{user?.email}</p>
            <p className="mt-0.5 text-xs text-gray-300">Member since {joinedDate}</p>
          </div>
        </div>

        {/* Edit form */}
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-5 font-semibold text-gray-800">Edit Details</h2>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Username */}
              <div>
                <label htmlFor="profile-username" className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700">
                  <User className="h-3.5 w-3.5" /> Username
                </label>
                <input id="profile-username" {...register('username')}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
                {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username.message}</p>}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="profile-email" className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700">
                  <Mail className="h-3.5 w-3.5" /> Email
                </label>
                <input id="profile-email" type="email" {...register('email')}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
              </div>

              {/* DOB */}
              <div>
                <label htmlFor="profile-dob" className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700">
                  <Calendar className="h-3.5 w-3.5" /> Date of Birth
                </label>
                <input id="profile-dob" type="date" {...register('date_of_birth')}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
              </div>

              {/* Gender */}
              <div>
                <label htmlFor="profile-gender" className="mb-1 block text-sm font-medium text-gray-700">
                  Gender
                </label>
                <select id="profile-gender" {...register('gender')}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none">
                  <option value="">Prefer not to say</option>
                  {Object.entries(GENDER_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={!isDirty || updateMutation.isPending}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Navigation links */}
        <div className="mt-4 rounded-2xl border bg-white shadow-sm divide-y">
          {[
            { to: '/profile/addresses', label: 'Manage Addresses' },
            { to: '/orders', label: 'My Orders' },
            { to: '/history', label: 'Purchase History' },
            { to: '/dues', label: 'My Dues' },
            { to: '/wishlist', label: 'Wishlist' },
            { to: '/promotions', label: 'Promotions & Offers' },
          ].map(({ to, label }) => (
            <Link key={to} to={to}
              className="flex items-center justify-between px-5 py-4 text-sm text-gray-700 hover:bg-gray-50">
              {label}
              <ChevronRight className="h-4 w-4 text-gray-300" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
