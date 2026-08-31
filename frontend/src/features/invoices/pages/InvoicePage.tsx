import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Printer } from 'lucide-react';
import { useCallback } from 'react';
import { useOrder } from '../../orders/hooks/useOrders';
import { formatCurrency } from '@utils/formatCurrency';
import { formatDate } from '@utils/formatDate';

export default function InvoicePage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { data: order, isPending } = useOrder(Number(orderId));

  const invoice = useMemo(() => order?.invoice ?? null, [order]);

  const invoiceLines = useMemo(
    () =>
      (order?.items ?? []).map((item) => {
        const title = item.variant_details?.product?.name ?? item.variant_details?.product_name ?? item.variant_details?.sku ?? (item.variant && typeof item.variant === 'object' ? `Variant #${item.variant.id}` : null) ?? `Item #${item.id}`;
        const specs = [item.variant_details?.color, item.variant_details?.size].filter(Boolean).join('/');
        return {
          name: specs ? `${title} (${specs})` : title,
          qty: item.quantity,
          unitPrice: Number(item.unit_price),
          discount: Number(item.discount ?? 0),
          total: Number(item.total_price),
        };
      }),
    [order?.items],
  );

  const handlePrint = useCallback(() => window.print(), []);

  if (isPending) {
    return <div className="mx-auto max-w-3xl animate-pulse space-y-4 px-4 py-10">
      <div className="h-80 rounded-2xl bg-gray-200" />
    </div>;
  }

  if (!order || !invoice) {
    return <div className="py-24 text-center text-gray-400">Invoice not available.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toolbar — hidden when printing */}
      <div className="no-print mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-4 w-4" /> Back to Order
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Printer className="h-4 w-4" /> Print Invoice
        </button>
      </div>

      {/* Invoice — rendered for print */}
      <main
        id="invoice"
        className="mx-auto max-w-3xl rounded-2xl border bg-white px-8 py-10 shadow-sm sm:px-12"
      >
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">ShopEase</h1>
            <p className="text-xs text-gray-400">Tax Invoice</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-bold text-gray-800">Invoice #{invoice.invoice_number}</p>
            <p className="text-gray-500">{formatDate(invoice.created_at)}</p>
            <p className="mt-1 text-gray-500">Order #{order.id}</p>
          </div>
        </div>

        {/* Bill to */}
        {order.address_details && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Ship To</p>
            <p className="text-gray-600">{order.address_details.name}</p>
            <p className="text-gray-500">{order.address_details.street}, {order.address_details.city} — {order.address_details.zipcode}</p>
            <p className="text-gray-500">{order.address_details.state}, {order.address_details.country}</p>
          </div>
        )}

        {/* Items table */}
        <table className="mb-6 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
              <th className="pb-3">Item</th>
              <th className="pb-3 text-right">Qty</th>
              <th className="pb-3 text-right">Unit Price</th>
              <th className="pb-3 text-right">Discount</th>
              <th className="pb-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {invoiceLines.map((line, i) => (
              <tr key={i}>
                <td className="py-3 text-gray-700">{line.name}</td>
                <td className="py-3 text-right text-gray-600">{line.qty}</td>
                <td className="py-3 text-right text-gray-600">{formatCurrency(line.unitPrice)}</td>
                <td className="py-3 text-right text-gray-500">−{formatCurrency(line.discount)}</td>
                <td className="py-3 text-right font-semibold text-gray-800">{formatCurrency(line.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="ml-auto max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span><span>{formatCurrency(invoice.sub_total)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Discount</span><span>−{formatCurrency(invoice.discount)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Tax</span><span>{formatCurrency(invoice.tax_amount)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Shipping</span><span>{formatCurrency(invoice.shipping_charge)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-bold text-gray-900">
            <span>Grand Total</span><span>{formatCurrency(invoice.grand_total)}</span>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-gray-300">
          Thank you for shopping with ShopEase · This is a computer-generated invoice
        </p>
      </main>
    </div>
  );
}
