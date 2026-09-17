import { Package } from 'lucide-react';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import type { ShippingOrderItem } from '../model/shippingTypes';

interface Props {
  items: ShippingOrderItem[];
  className?: string;
}

export function ShippingManifestItemsList({
  items,
  className = '',
}: Props) {
  const totalUnits = items.reduce((acc, it) => acc + (it.quantity || 1), 0);

  return (
    <div className={`rounded-xl border border-gray-200 bg-white overflow-hidden shadow-2xs ${className}`}>
      <div className="bg-gray-50/80 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
          <Package className="h-4 w-4 text-blue-600" />
          Products to Pack & Dispatch ({items.length} {items.length === 1 ? 'line item' : 'line items'})
        </span>
        <span className="text-xs font-medium text-gray-500">
          Total Units:{' '}
          <strong className="text-gray-900 font-mono">{totalUnits}</strong>
        </span>
      </div>

      <div className="divide-y divide-gray-100">
        {items.map((item) => {
          const variant = item.variant_details;
          const product = variant?.product;
          const imageUrl =
            item.product_image ||
            product?.images?.find((img) => img.is_primary)?.image_url ||
            product?.images?.[0]?.image_url;

          return (
            <div key={item.id} className="flex items-center justify-between p-4 gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={item.product_name || 'Product'}
                    className="h-12 w-12 rounded-lg object-cover border border-gray-200 shrink-0"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
                    <Package className="h-6 w-6" />
                  </div>
                )}

                <div className="min-w-0 space-y-0.5">
                  <div className="text-xs font-bold text-gray-900 truncate">
                    {item.product_name || product?.name || 'Product'}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                    {variant?.sku && (
                      <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">
                        SKU: {variant.sku}
                      </span>
                    )}
                    {variant?.color && <span>Color: <strong>{variant.color}</strong></span>}
                    {variant?.size && <span>Size: <strong>{variant.size}</strong></span>}
                  </div>
                </div>
              </div>

              {/* Quantity & Pricing */}
              <div className="flex items-center gap-6 shrink-0 text-right">
                <div>
                  <div className="text-xs text-gray-500">Quantity to Pack</div>
                  <div className="text-base font-extrabold text-blue-700 font-mono">
                    {item.quantity} units
                  </div>
                </div>

                <div className="min-w-[80px]">
                  <div className="text-xs font-bold text-gray-900 font-mono">
                    {formatCurrency(item.total_price)}
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono">
                    {formatCurrency(item.unit_price)} each
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
