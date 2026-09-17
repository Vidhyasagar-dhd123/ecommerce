import { useState } from 'react';
import {
  Truck,
  Building2,
  Mail,
  Phone,
  CheckCircle2,
  Clock,
  PackageCheck,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react';
import type { VendorItem, VendorImportItem } from '../model/inventoryTypes';

interface Props {
  vendors: VendorItem[];
  imports: VendorImportItem[];
  currentWarehouseId: number | null;
  onReceiveImport: (importId: number) => void;
  isReceiving: boolean;
  onOpenInitiateImport: () => void;
  onOpenCreateVendor: () => void;
}

export function VendorImportsTab({
  vendors,
  imports,
  currentWarehouseId,
  onReceiveImport,
  isReceiving,
  onOpenInitiateImport,
  onOpenCreateVendor,
}: Props) {
  const [expandedImportId, setExpandedImportId] = useState<number | null>(null);

  // Filter imports for current warehouse
  const warehouseImports = currentWarehouseId
    ? imports.filter((i) => i.warehouse === currentWarehouseId)
    : imports;

  const toggleExpand = (id: number) => {
    setExpandedImportId(expandedImportId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* ── Section 1: Inbound Vendor Goods / Shipments ── */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 bg-slate-50/70 p-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Inbound Vendor Goods Receipts</h2>
              <p className="text-xs text-gray-500">
                Receive shipments directly into warehouse inventory
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenInitiateImport}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Initiate Goods Import</span>
            </button>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
              {warehouseImports.length} Record{warehouseImports.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {warehouseImports.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Truck className="mx-auto h-8 w-8 text-gray-300 mb-2" />
            <p className="text-xs font-semibold">No vendor imports scheduled for this warehouse.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {warehouseImports.map((imp) => {
              const isExpanded = expandedImportId === imp.id;
              const isPending = imp.status === 'pending';
              const vendor = vendors.find((v) => v.id === imp.vendor);

              return (
                <div key={imp.id} className="p-4 sm:px-6 transition-all hover:bg-slate-50/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-gray-900 text-sm">
                          Import #{imp.id}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border ${
                            isPending
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {isPending ? (
                            <>
                              <Clock className="h-3 w-3" />
                              <span>Awaiting Receipt</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              <span className="capitalize">{imp.status}</span>
                            </>
                          )}
                        </span>
                      </div>

                      <div className="text-xs text-gray-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-semibold text-gray-800">
                          Supplier: {vendor?.name || imp.vendor_name || `Vendor #${imp.vendor}`}
                        </span>
                        <span>•</span>
                        <span>Date: {imp.import_date}</span>
                        <span>•</span>
                        <span>Amount: ₹{Number(imp.total_amount).toLocaleString()}</span>
                        <span>•</span>
                        <span>{imp.items?.length || 0} line items</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isPending && (
                        <button
                          type="button"
                          disabled={isReceiving}
                          onClick={() => onReceiveImport(imp.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-all cursor-pointer"
                        >
                          <PackageCheck className="h-4 w-4" />
                          <span>Receive Goods</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleExpand(imp.id)}
                        className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-all cursor-pointer"
                      >
                        <span>{isExpanded ? 'Hide Items' : 'View Items'}</span>
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Items Drawer */}
                  {isExpanded && imp.items && imp.items.length > 0 && (
                    <div className="mt-4 rounded-xl bg-gray-50 p-3.5 border border-gray-200/60 text-xs">
                      <div className="font-bold text-gray-800 mb-2">Shipment Manifest:</div>
                      <div className="divide-y divide-gray-200/60">
                        {imp.items.map((item) => (
                          <div key={item.id} className="py-2 flex items-center justify-between text-gray-700">
                            <span className="font-mono font-semibold text-gray-900">
                              {item.variant_sku || `Variant #${item.variant}`}
                            </span>
                            <div className="flex items-center gap-4">
                              <span>Qty: <strong>{item.quantity} units</strong></span>
                              <span>Unit Cost: ₹{Number(item.unit_cost).toLocaleString()}</span>
                              <span className="font-bold text-gray-900">Total: ₹{Number(item.total_cost).toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Section 2: Certified Suppliers / Vendors ── */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 bg-slate-50/70 p-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Registered Suppliers & Vendors</h2>
              <p className="text-xs text-gray-500">Authorized suppliers providing warehouse merchandise</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenCreateVendor}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Supplier</span>
            </button>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
              {vendors.length} Vendors
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
          {vendors.map((v) => (
            <div
              key={v.id}
              className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs space-y-2.5 hover:border-gray-300 transition-all"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm">{v.name}</h3>
                <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200/60">
                  Active Supplier
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-gray-600">
                {v.contact_person && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Contact:</span>
                    <span className="font-medium text-gray-800">{v.contact_person}</span>
                  </div>
                )}
                {v.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                    <span className="truncate">{v.email}</span>
                  </div>
                )}
                {v.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                    <span>{v.phone}</span>
                  </div>
                )}
                {v.address && (
                  <div className="text-[11px] text-gray-500 line-clamp-2 pt-1 border-t border-gray-100">
                    {v.address}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
