import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Package, Truck, CheckCircle, Clock } from 'lucide-react';
import { useOrder } from '../hooks/useOrders';
import { formatDate } from '@utils/formatDate';
import type { Order } from '../model/types';

type TimelineStep = { label: string; done: boolean; date?: string; active: boolean };

function buildTimeline(order: Order): TimelineStep[] {
  const reached = (s: string) =>
    ['pending','confirmed','shipped','delivered'].indexOf(order.status) >=
    ['pending','confirmed','shipped','delivered'].indexOf(s);

  return [
    { label: 'Order Placed', done: reached('pending'), active: order.status === 'pending', date: order.created_at },
    { label: 'Confirmed', done: reached('confirmed'), active: order.status === 'confirmed', date: undefined },
    { label: 'Shipped', done: reached('shipped'), active: order.status === 'shipped', date: order.shipment?.ship_date ?? undefined },
    { label: 'Delivered', done: reached('delivered'), active: order.status === 'delivered', date: order.shipment?.delivery_date ?? undefined },
  ];
}

export default function OrderTrackPage() {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);

  // Poll every 30s; stop on terminal statuses
  const { data: order, isPending } = useOrder(orderId, {
    refetchInterval: 30_000,
  });

  const timeline = useMemo(() => (order ? buildTimeline(order) : []), [order]);
  const isTerminal = useMemo(
    () => ['delivered', 'cancelled', 'returned'].includes(order?.status ?? ''),
    [order?.status],
  );

  if (isPending) {
    return (
      <div className="mx-auto max-w-2xl animate-pulse space-y-4 px-4 py-10">
        <div className="h-5 w-1/3 rounded bg-gray-200" />
        <div className="h-40 rounded-2xl bg-gray-200" />
      </div>
    );
  }

  if (!order) return <div className="py-20 text-center text-gray-400">Order not found</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-3">
          <Link to={`/orders/${order.id}`} aria-label="Back to order" className="text-gray-400 hover:text-gray-600">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Track Order #{order.id}</h1>
            {!isTerminal && (
              <p className="text-xs text-gray-400">Updates every 30 seconds</p>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-2xl border bg-white p-6">
          <ol role="list" className="space-y-0">
            {timeline.map((step, idx) => (
              <li key={step.label} role="listitem" className="flex gap-4">
                {/* Connector */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition ${
                      step.done
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : step.active
                        ? 'border-blue-300 bg-blue-50 text-blue-600'
                        : 'border-gray-200 bg-gray-50 text-gray-300'
                    }`}
                    aria-current={step.active ? 'step' : undefined}
                  >
                    {step.done ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                  </div>
                  {idx < timeline.length - 1 && (
                    <div className={`h-10 w-0.5 ${step.done ? 'bg-blue-600' : 'bg-gray-200'}`} />
                  )}
                </div>
                {/* Text */}
                <div className="pb-8">
                  <p className={`text-sm font-semibold ${step.done ? 'text-gray-900' : 'text-gray-400'}`}>
                    {step.label}
                  </p>
                  {step.date && (
                    <p className="text-xs text-gray-400">{formatDate(step.date)}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>

          {/* Cancelled or returned */}
          {(order.status === 'cancelled' || order.status === 'returned') && (
            <div className="mt-2 rounded-xl bg-gray-50 p-3 text-sm text-gray-500">
              This order was <span className="font-semibold">{order.status}</span>.
            </div>
          )}
        </div>

        {/* Shipment info */}
        {order.shipment && (
          <div className="mt-4 rounded-2xl border bg-white p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-800">
              <Truck className="h-4 w-4 text-blue-500" /> Shipment Details
            </h2>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Carrier:</span> {order.shipment.carrier}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Tracking:</span> {order.shipment.tracking_number}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex gap-3">
          <Link to={`/orders/${order.id}`}
            className="flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Package className="h-4 w-4" /> View Details
          </Link>
          {order.status === 'delivered' && (
            <Link to={`/orders/${order.id}/return`}
              className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-medium text-orange-700 hover:bg-orange-100">
              Request Return
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
