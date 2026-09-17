import { useState } from 'react';
import { MapPin, Phone, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export interface AddressDetails {
  id?: number;
  title?: string;
  street_address?: string;
  apartment_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  phone_number?: string;
}

interface Props {
  address?: AddressDetails | null;
  allowCopyPhone?: boolean;
  className?: string;
}

export function OrderDeliveryAddressCard({
  address,
  allowCopyPhone = true,
  className = '',
}: Props) {
  const [copiedPhone, setCopiedPhone] = useState(false);

  if (!address) {
    return (
      <div className={`rounded-xl border border-gray-100 bg-gray-50/50 p-4 ${className}`}>
        <div className="flex items-center gap-1.5 mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
          <MapPin className="h-3.5 w-3.5 text-gray-400" />
          <span>Delivery Address</span>
        </div>
        <p className="text-xs text-gray-400">No delivery address details provided</p>
      </div>
    );
  }

  const handleCopyPhone = (phone: string) => {
    void navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
    toast.success('Phone number copied!');
  };

  return (
    <div className={`rounded-xl border border-gray-100 bg-gray-50/50 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
          <MapPin className="h-3.5 w-3.5 text-gray-400" />
          <span>Delivery Address</span>
        </div>
        {address.title && (
          <span className="rounded bg-gray-200/70 px-2 py-0.5 text-[10px] font-bold text-gray-700">
            {address.title}
          </span>
        )}
      </div>

      <div className="space-y-1 text-xs text-gray-700">
        <p className="font-semibold text-gray-900">{address.street_address}</p>
        {address.apartment_address && <p>{address.apartment_address}</p>}
        <p>
          {address.city}, {address.state} {address.postal_code ? `- ${address.postal_code}` : ''}
        </p>

        {address.phone_number && (
          <div className="pt-1.5 flex items-center justify-between border-t border-gray-200/60 mt-2">
            <span className="text-gray-500 flex items-center gap-1">
              <Phone className="h-3 w-3 text-gray-400" />
              <span>{address.phone_number}</span>
            </span>

            {allowCopyPhone && (
              <button
                type="button"
                onClick={() => handleCopyPhone(address.phone_number!)}
                className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition cursor-pointer"
                title="Copy phone number"
              >
                {copiedPhone ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
