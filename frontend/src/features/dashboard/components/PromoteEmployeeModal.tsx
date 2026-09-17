import { useState } from 'react';
import { X, UserPlus, Shield } from 'lucide-react';
import type { PromoteEmployeePayload } from '../model/adminTypes';

interface PromoteEmployeeModalProps {
  user: { id: number; username: string } | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: PromoteEmployeePayload) => void;
  isPending: boolean;
}

export function PromoteEmployeeModal({
  user,
  isOpen,
  onClose,
  onSubmit,
  isPending,
}: PromoteEmployeeModalProps) {
  const [designation, setDesignation] = useState<
    'ShippingExecutive' | 'InventoryManager' | 'SupportAgent'
  >('SupportAgent');
  const [employeeCode, setEmployeeCode] = useState(
    user ? `EMP-${user.id.toString().padStart(4, '0')}` : 'EMP-0001'
  );
  const [hireDate, setHireDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [warehouse, setWarehouse] = useState<number | undefined>(undefined);

  if (!isOpen || !user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      user_id: user.id,
      employee_code: employeeCode,
      designation,
      hire_date: hireDate,
      warehouse: warehouse ? Number(warehouse) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-900">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <UserPlus className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold">Promote User to Staff</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            Promoting <span className="font-semibold text-slate-900">@{user.username}</span> (User #{user.id}) to an internal Employee role with operational dashboard permissions.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Designation / Role
            </label>
            <select
              value={designation}
              onChange={(e) =>
                setDesignation(
                  e.target.value as
                    | 'ShippingExecutive'
                    | 'InventoryManager'
                    | 'SupportAgent'
                )
              }
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-600 focus:outline-none"
            >
              <option value="SupportAgent">Support Agent (Support Desk & Customer Orders)</option>
              <option value="ShippingExecutive">Shipping Executive (Dispatch Hub & Tracking)</option>
              <option value="InventoryManager">Inventory Manager (Stock Adjust & Transfers)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Employee Code
            </label>
            <input
              type="text"
              required
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
              placeholder="e.g. EMP-0042"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Hire Date
            </label>
            <input
              type="date"
              required
              value={hireDate}
              onChange={(e) => setHireDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Stationed Warehouse ID (Optional)
            </label>
            <input
              type="number"
              value={warehouse ?? ''}
              onChange={(e) => setWarehouse(e.target.value ? Number(e.target.value) : undefined)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
              placeholder="e.g. 1"
            />
          </div>


          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
            >
              <Shield className="h-3.5 w-3.5" />
              {isPending ? 'Promoting...' : 'Confirm Promotion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
