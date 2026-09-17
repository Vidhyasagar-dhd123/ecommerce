import type { Address } from '../../orders/model/types';
import {memo} from 'react';

// ── Address Card ──────────────────────────────────────────
const AddressCard = memo(function AddressCard({
  address, onEdit, onDelete, onSetDefault, isDeleting, isSettingDefault,
}: {
  address: Address;
  onEdit: (a: Address) => void;
  onDelete: (id: number) => void;
  onSetDefault: (id: number) => void;
  isDeleting: boolean;
  isSettingDefault: boolean;
}) {
  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm ${address.is_default ? 'border-blue-400' : 'border-gray-100'}`}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-800">{address.name}</p>
          <span className="text-xs text-gray-400 capitalize">{address.address_type}</span>
        </div>
        {address.is_default && (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">Default</span>
        )}
      </div>
      <p className="text-sm text-gray-600">{address.street}</p>
      <p className="text-sm text-gray-500">{address.city}, {address.state} — {address.zipcode}</p>
      <p className="text-sm text-gray-500">{address.country}</p>
      {address.landmark && <p className="mt-0.5 text-xs text-gray-400">Near: {address.landmark}</p>}

      <div className="mt-4 flex gap-2">
        <button onClick={() => onEdit(address)}
          className="rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
          Edit
        </button>
        {!address.is_default && (
          <button onClick={() => onSetDefault(address.id)} disabled={isSettingDefault}
            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50">
            Set Default
          </button>
        )}
        <button onClick={() => onDelete(address.id)} disabled={isDeleting}
          className="ml-auto rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50">
          Delete
        </button>
      </div>
    </div>
  );
});

export default AddressCard