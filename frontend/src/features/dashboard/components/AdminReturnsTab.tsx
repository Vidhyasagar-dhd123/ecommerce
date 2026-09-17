import { RotateCcw, CheckCircle, XCircle, ExternalLink } from 'lucide-react';

interface AdminReturnsTabProps {
  returns: any[];
  isLoading: boolean;
  onApproveReturn: (id: number) => void;
  onRejectReturn: (id: number) => void;
  isActionPending: boolean;
}

export function AdminReturnsTab({
  returns,
  isLoading,
  onApproveReturn,
  onRejectReturn,
  isActionPending,
}: AdminReturnsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Customer Return Requests</h2>
          <p className="text-xs text-slate-500">Inspect and resolve customer return claims.</p>
        </div>
        <a
          href="http://localhost:8000/admin/fulfillment/return/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
        >
          Fulfillment Portal
          <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
        </a>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Return ID</th>
                <th className="px-4 py-3">Order Ref</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Requested</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="p-4">
                      <div className="h-6 animate-pulse rounded-md bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No return requests pending
                  </td>
                </tr>
              ) : (
                returns.map((ret) => {
                  const isReceived = ret.status === 'received';
                  return (
                    <tr key={ret.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        #RET-{ret.id}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800">
                        Order #{ret.order}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate">
                        {ret.reason}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                            ret.status === 'approved' || ret.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-700/10'
                              : ret.status === 'rejected'
                                ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-700/10'
                                : 'bg-amber-50 text-amber-700 ring-1 ring-amber-700/10'
                          }`}
                        >
                          {ret.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">
                        {ret.return_date || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isReceived && (
                            <>
                              <button
                                onClick={() => onApproveReturn(ret.id)}
                                disabled={isActionPending}
                                className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-50"
                              >
                                <CheckCircle className="h-3 w-3" />
                                Approve
                              </button>
                              <button
                                onClick={() => onRejectReturn(ret.id)}
                                disabled={isActionPending}
                                className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 shadow-2xs hover:bg-rose-100 disabled:opacity-50"
                              >
                                <XCircle className="h-3 w-3" />
                                Reject
                              </button>
                            </>
                          )}
                          <a
                            href={`http://localhost:8000/admin/fulfillment/return/${ret.id}/change/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            title="Open in Django Admin"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
