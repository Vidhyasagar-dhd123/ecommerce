import { formatCurrency } from '@/shared/utils/formatCurrency';
import { CouponUsedBadge } from './CouponUsedBadge';

interface Props {
  payment?: {
    payment_method?: string;
    payment_status?: string;
  } | null;
  invoice?: {
    invoice_number?: string;
    sub_total?: string | number;
    discount?: string | number;
    tax_amount?: string | number;
    shipping_charge?: string | number;
  } | null;
  couponCode?: string | null;
  totalAmount: string | number;
  className?: string;
}

export function OrderFinancialSummaryCard({
  payment,
  invoice,
  couponCode,
  totalAmount,
  className = '',
}: Props) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      {/* Payment & Invoice Status Box */}
      <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-2 text-xs">
        <span className="font-bold uppercase tracking-wider text-gray-500 block mb-2">
          Payment & Invoice Info
        </span>
        <div className="flex justify-between">
          <span className="text-gray-400">Payment Method:</span>
          <span className="font-bold text-gray-800 uppercase">
            {payment?.payment_method ?? 'COD'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Payment Status:</span>
          <span className="font-bold text-emerald-700 uppercase">
            {payment?.payment_status ?? 'pending'}
          </span>
        </div>
        {invoice?.invoice_number && (
          <div className="flex justify-between pt-1 border-t border-gray-200">
            <span className="text-gray-400">Invoice Number:</span>
            <span className="font-mono font-bold text-blue-700">
              {invoice.invoice_number}
            </span>
          </div>
        )}
        {couponCode && (
          <div className="flex justify-between items-center pt-1 border-t border-gray-200">
            <span className="text-gray-400">Coupon Applied:</span>
            <CouponUsedBadge couponCode={couponCode} />
          </div>
        )}
      </div>

      {/* Pricing Breakdown Box */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2 text-xs">
        <span className="font-bold uppercase tracking-wider text-gray-500 block mb-2">
          Amount & Discount Breakdown
        </span>
        {invoice && (
          <>
            {invoice.sub_total !== undefined && (
              <div className="flex justify-between text-gray-600">
                <span>Gross Subtotal:</span>
                <span>{formatCurrency(invoice.sub_total)}</span>
              </div>
            )}
            {invoice.discount !== undefined && parseFloat(String(invoice.discount)) > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Total Discount (Offers + Coupons):</span>
                <span>-{formatCurrency(invoice.discount)}</span>
              </div>
            )}
            {invoice.tax_amount !== undefined && (
              <div className="flex justify-between text-gray-600">
                <span>GST Taxes (18%):</span>
                <span>{formatCurrency(invoice.tax_amount)}</span>
              </div>
            )}
            {invoice.shipping_charge !== undefined && (
              <div className="flex justify-between text-gray-600">
                <span>Shipping Fee:</span>
                <span>{formatCurrency(invoice.shipping_charge)}</span>
              </div>
            )}
          </>
        )}
        <div className="flex justify-between pt-2 border-t border-gray-200 text-sm font-extrabold text-gray-900">
          <span>Grand Total:</span>
          <span className="text-blue-600 font-mono">{formatCurrency(totalAmount)}</span>
        </div>
      </div>
    </div>
  );
}
