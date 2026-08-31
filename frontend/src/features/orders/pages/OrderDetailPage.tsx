import { useMemo, useCallback, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin, CreditCard, FileText, Truck, RotateCcw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import { useOrder, useCancelOrder, useRequestReturn } from '../hooks/useOrders';
import { handleApiError } from '@utils/apiHelpers';
import { formatCurrency } from '@utils/formatCurrency';
import { formatDate, formatDateTime } from '@utils/formatDate';

const returnSchema = z.object({
  reason: z.string().min(10, 'Please describe the issue (min 10 characters)').max(500),
});
type ReturnForm = z.infer<typeof returnSchema>;

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  shipped: 'bg-purple-50 text-purple-700 border-purple-200',
  delivered: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  returned: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const orderId = Number(id);

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);

  const { data: order, isPending, isError } = useOrder(orderId);
  const cancelMutation = useCancelOrder();
  const returnMutation = useRequestReturn();

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<ReturnForm>({
    resolver: zodResolver(returnSchema),
  });

  // ── Derived ───────────────────────────────────────────────
  const canCancel = useMemo(
    () => order && ['pending', 'confirmed'].includes(order.status),
    [order],
  );

  const canReturn = useMemo(
    () => order?.status === 'delivered',
    [order],
  );

  const handleCancel = useCallback(() => {
    cancelMutation.mutate(orderId, {
      onSuccess: () => setShowCancelConfirm(false),
    });
  }, [cancelMutation, orderId]);

  const handleReturn = useCallback(
    (data: ReturnForm) => {
      returnMutation.mutate(
        { orderId, reason: data.reason },
        {
          onSuccess: () => {
            setShowReturnForm(false);
            navigate('/orders');
          },
          onError: (err) => handleApiError(err, setError, (msg) => toast.error(msg)),
        },
      );
    },
    [returnMutation, orderId, navigate, setError],
  );

  if (isPending) {
    return (
      <div className="mx-auto max-w-3xl animate-pulse space-y-4 px-4 py-10">
        <div className="h-6 w-1/4 rounded bg-gray-200" />
        <div className="h-40 rounded-2xl bg-gray-200" />
        <div className="h-32 rounded-2xl bg-gray-200" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="py-24 text-center">
        <p className="text-gray-500">
          {isError ? 'Failed to load order. Please try again.' : 'Order not found.'}
        </p>
        <Link to="/orders" className="mt-4 block text-blue-600 underline">Back to Orders</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => navigate(-1)} aria-label="Go back" className="text-gray-400 hover:text-gray-600">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Order #{order.id}</h1>
            <p className="text-xs text-gray-400">
              {order.created_at ? formatDateTime(order.created_at) : (order.order_date ? formatDate(order.order_date) : '')}
            </p>
          </div>
          <span className={`ml-auto rounded-full border px-3 py-1 text-xs font-medium capitalize ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
            {order.status}
          </span>
        </div>

        <div className="space-y-4">
          {/* Items */}
          <div className="rounded-2xl border bg-white p-5">
            <h2 className="mb-4 font-semibold text-gray-800">Items ({order.items?.length ?? 0})</h2>
            <ul className="divide-y">
              {order.items?.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {item.variant_details?.product?.name ?? item.variant_details?.product_name ?? item.variant_details?.sku ?? (item.variant && typeof item.variant === 'object' ? `Variant #${item.variant.id}` : null) ?? `Item #${item.id}`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {[item.variant_details?.color, item.variant_details?.size].filter(Boolean).join(' / ')} {item.variant_details?.color || item.variant_details?.size ? '× ' : 'Qty: '}{item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-gray-700">{formatCurrency(item.total_price)}</p>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t pt-3 text-sm font-bold text-gray-900">
              <span>Total</span>
              <span>{formatCurrency(order.total_amount)}</span>
            </div>
          </div>

          {/* Delivery address */}
          {order.address_details && (
            <div className="rounded-2xl border bg-white p-5">
              <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-800">
                <MapPin className="h-4 w-4 text-blue-500" /> Delivery Address
              </h2>
              <p className="text-sm text-gray-700">{order.address_details.name ?? 'Customer'}</p>
              <p className="text-sm text-gray-500">
                {[order.address_details.street, order.address_details.city].filter(Boolean).join(', ')}
                {order.address_details.zipcode ? ` — ${order.address_details.zipcode}` : ''}
              </p>
              <p className="text-sm text-gray-500">
                {[order.address_details.state, order.address_details.country].filter(Boolean).join(', ')}
              </p>
            </div>
          )}

          {/* Payment */}
          {order.payment && (
            <div className="rounded-2xl border bg-white p-5">
              <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-800">
                <CreditCard className="h-4 w-4 text-blue-500" /> Payment
              </h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-400">Method</div>
                <div className="font-medium text-gray-700 capitalize">{order.payment.payment_method}</div>
                <div className="text-gray-400">Status</div>
                <div className={`font-medium capitalize ${order.payment.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                  {order.payment.payment_status}
                </div>
                <div className="text-gray-400">Amount</div>
                <div className="font-bold text-gray-900">{formatCurrency(order.payment.amount)}</div>
              </div>
            </div>
          )}

          {/* Shipment */}
          {order.shipment && (
            <div className="rounded-2xl border bg-white p-5">
              <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-800">
                <Truck className="h-4 w-4 text-blue-500" /> Shipment
              </h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-400">Carrier</div>
                <div className="font-medium text-gray-700">{order.shipment.carrier}</div>
                <div className="text-gray-400">Tracking #</div>
                <div className="font-medium text-gray-700">{order.shipment.tracking_number}</div>
                {order.shipment.ship_date && (
                  <>
                    <div className="text-gray-400">Shipped</div>
                    <div className="text-gray-700">{formatDate(order.shipment.ship_date)}</div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Link
              to={`/orders/${order.id}/track`}
              className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
            >
              <Truck className="h-4 w-4" /> Track Order
            </Link>

            {order.invoice && (
              <Link
                to={`/invoices/${order.id}`}
                className="flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <FileText className="h-4 w-4" /> View Invoice
              </Link>
            )}

            {canReturn && (
              <button
                onClick={() => setShowReturnForm((v) => !v)}
                className="flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-medium text-orange-700 hover:bg-orange-100"
              >
                <RotateCcw className="h-4 w-4" /> Return
              </button>
            )}

            {canCancel && !showCancelConfirm && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100"
              >
                Cancel Order
              </button>
            )}
          </div>

          {/* Cancel confirmation */}
          {showCancelConfirm && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="mb-3 text-sm text-red-700">Are you sure you want to cancel this order?</p>
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  disabled={cancelMutation.isPending}
                  className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {cancelMutation.isPending ? 'Cancelling…' : 'Yes, Cancel'}
                </button>
                <button onClick={() => setShowCancelConfirm(false)}
                  className="rounded-xl border px-4 py-2 text-xs font-medium text-gray-700 hover:bg-white">
                  No, Keep Order
                </button>
              </div>
            </div>
          )}

          {/* Return form */}
          {showReturnForm && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
              <h3 className="mb-3 font-semibold text-orange-800">Return Request</h3>
              <form onSubmit={handleSubmit(handleReturn)} noValidate>
                <label htmlFor="return-reason" className="mb-1 block text-sm font-medium text-orange-700">
                  Reason for return
                </label>
                <textarea
                  id="return-reason"
                  {...register('reason')}
                  rows={3}
                  placeholder="Describe the issue…"
                  className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                />
                {errors.reason && <p className="mt-1 text-xs text-red-600">{errors.reason.message}</p>}
                <div className="mt-3 flex gap-2">
                  <button type="submit" disabled={isSubmitting || returnMutation.isPending}
                    className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
                    {returnMutation.isPending ? 'Submitting…' : 'Submit Return'}
                  </button>
                  <button type="button" onClick={() => setShowReturnForm(false)}
                    className="rounded-xl border px-4 py-2 text-xs font-medium text-gray-700 hover:bg-white">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
