import { useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RotateCcw, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';

import { useOrder, useRequestReturn } from '../../orders/hooks/useOrders';
import { handleApiError } from '@utils/apiHelpers';

const returnSchema = z.object({
  reason: z.string().min(10, 'Minimum 10 characters').max(500),
});
type ReturnForm = z.infer<typeof returnSchema>;

export default function RequestReturnPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const orderId = Number(id);

  const { data: order, isPending } = useOrder(orderId);
  const returnMutation = useRequestReturn();

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<ReturnForm>({
    resolver: zodResolver(returnSchema),
  });

  // Guard — only delivered orders can be returned
  const isEligible = useMemo(() => order?.status === 'delivered', [order?.status]);

  const onSubmit = useCallback(
    (data: ReturnForm) => {
      returnMutation.mutate(
        { orderId, reason: data.reason },
        {
          onSuccess: () => {
            toast.success('Return request submitted');
            navigate(`/orders/${orderId}`);
          },
          onError: (err) => handleApiError(err, setError, (msg) => toast.error(msg)),
        },
      );
    },
    [returnMutation, orderId, navigate, setError],
  );

  if (isPending) return <div className="py-20 text-center text-gray-400">Loading…</div>;

  if (!isEligible) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <RotateCcw className="mx-auto mb-3 h-10 w-10 text-gray-200" />
        <p className="text-gray-500">Returns are only available for delivered orders.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 underline text-sm">Go back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        <div className="rounded-2xl border bg-white p-6">
          <h1 className="mb-1 text-xl font-bold text-gray-900">Request Return</h1>
          <p className="mb-6 text-sm text-gray-400">Order #{orderId}</p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <div>
              <label htmlFor="return-reason" className="mb-1 block text-sm font-medium text-gray-700">
                Reason for Return
              </label>
              <textarea
                id="return-reason"
                {...register('reason')}
                rows={5}
                placeholder="Describe the issue with your order…"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
              />
              {errors.reason && (
                <p className="mt-1 text-xs text-red-500">{errors.reason.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || returnMutation.isPending}
              className="w-full rounded-xl bg-orange-600 py-3 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {returnMutation.isPending ? 'Submitting…' : 'Submit Return Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
