import { CheckCircle2, AlertTriangle, XCircle, Package } from 'lucide-react';
import type { WarehouseAvailability } from '../model/supportTypes';

interface Props {
  availability?: WarehouseAvailability;
}

export function OrderAvailabilityBadge({ availability }: Props) {
  if (!availability || !availability.warehouse_id) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
        <Package className="h-3 w-3" /> Warehouse N/A
      </span>
    );
  }

  if (availability.all_available) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200"
        title="All requested products and quantities are available in your assigned warehouse"
      >
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        All In Stock ({availability.warehouse_name ?? 'Local'})
      </span>
    );
  }

  const sufficientCount = availability.details.filter((d) => d.is_sufficient).length;
  const totalCount = availability.details.length;

  if (sufficientCount > 0) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200"
        title={`Only ${sufficientCount} of ${totalCount} items are fully stocked in your warehouse`}
      >
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
        Partial Stock ({sufficientCount}/{totalCount})
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200"
      title="None of the ordered products have sufficient stock in your assigned warehouse"
    >
      <XCircle className="h-3.5 w-3.5 text-rose-600" />
      Out of Stock
    </span>
  );
}
