import { ShoppingBag, ExternalLink, Plus, Layers } from 'lucide-react';

interface AdminCatalogTabProps {
  products: any[];
  isLoading: boolean;
}

export function AdminCatalogTab({ products, isLoading }: AdminCatalogTabProps) {
  return (
    <div className="space-y-4">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Platform Product Catalog</h2>
          <p className="text-xs text-slate-500">Live products and SKU configurations in the system.</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="http://localhost:8000/admin/products/product/add/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Product
          </a>
          <a
            href="http://localhost:8000/admin/products/product/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
          >
            Manage in Django
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </a>
        </div>
      </div>

      {/* ── Products Grid ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-slate-200" />
          ))
        ) : products.length === 0 ? (
          <div className="col-span-full rounded-xl border border-slate-200 bg-white py-12 text-center text-slate-400">
            No products found in catalog
          </div>
        ) : (
          products.map((p) => {
            const primaryImg = p.images?.find((img: any) => img.is_primary)?.image_url || p.images?.[0]?.image_url;
            return (
              <div
                key={p.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex gap-3.5">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100 border border-slate-200">
                    {primaryImg ? (
                      <img
                        src={primaryImg}
                        alt={p.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl text-slate-400">
                        🛍️
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {p.name}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          p.status
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {p.status ? 'Active' : 'Draft'}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-blue-600">
                      ${Number(p.base_price).toFixed(2)}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {p.category_name || p.brand_name ? `${p.brand_name || ''} · ${p.category_name || ''}` : p.slug}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <Layers className="h-3 w-3" />
                    {p.variants?.length ?? 0} variants
                  </span>
                  <a
                    href={`http://localhost:8000/admin/products/product/${p.id}/change/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Edit in Admin
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
