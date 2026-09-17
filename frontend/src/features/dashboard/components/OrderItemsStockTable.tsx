import { formatCurrency } from '@/shared/utils/formatCurrency';
import type { SupportOrderItem, WarehouseAvailability } from '../model/supportTypes';

interface Props {
  items: SupportOrderItem[];
  availability?: WarehouseAvailability | null;
  className?: string;
}

export function OrderItemsStockTable({
  items,
  availability,
  className = '',
}: Props) {
  return (
    <div className={className}>
      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
        Order Items & Warehouse Stock Verification
      </h3>

      <div className="rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs min-w-[640px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/75 text-gray-500 font-semibold uppercase text-[11px]">
              <th className="py-2.5 px-4">Item Details</th>
              <th className="py-2.5 px-3">SKU & Variant</th>
              <th className="py-2.5 px-3 text-center">Qty Ordered</th>
              <th className="py-2.5 px-3 text-center">Warehouse Stock</th>
              <th className="py-2.5 px-3 text-right">Unit Price</th>
              <th className="py-2.5 px-3 text-right">Discount</th>
              <th className="py-2.5 px-4 text-right">Total Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {items.map((item) => {
              const variant = item.variant_details;
              const imageUrl =
                item.product_image ??
                variant?.product?.images?.[0]?.image_url ??
                null;
              const productName =
                item.product_name ??
                variant?.product?.name ??
                `Product (Variant #${item.variant})`;
              const availInfo = availability?.details?.find(
                (d) => d.variant_id === item.variant
              );

              return (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-gray-900">
                    <div className="flex items-center gap-3">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={productName}
                          className="h-10 w-10 rounded-lg object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 font-bold">
                          #
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900 line-clamp-1">
                          {productName}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-gray-600">
                    <p className="font-mono text-[11px] font-bold text-gray-700">
                      {variant?.sku ?? `Variant #${item.variant}`}
                    </p>
                    {variant && (
                      <p className="text-[11px] text-gray-400">
                        {variant.color} • {variant.size}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-gray-900 text-sm">
                    {item.quantity}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {availInfo ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${
                          availInfo.is_sufficient
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {availInfo.available} in stock
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right text-gray-600">
                    {formatCurrency(item.unit_price)}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-600 font-medium">
                    {parseFloat(item.discount || '0') > 0
                      ? `-${formatCurrency(item.discount)}`
                      : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-gray-900">
                    {formatCurrency(item.total_price)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
