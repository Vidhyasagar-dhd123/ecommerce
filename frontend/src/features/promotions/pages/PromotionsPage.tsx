import { useMemo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, Copy, CheckCheck, Clock } from 'lucide-react';
import { useOffers } from '../../orders/hooks/useOrders';
import { isActive, daysUntil } from '@utils/formatDate';
import { formatDate } from '@utils/formatDate';

interface Offer {
  id: number;
  title: string;
  description?: string;
  discount_type: string;
  discount_value: string;
  start_date: string;
  end_date: string;
  status: boolean;
  coupon_code?: string;
  category?: { name: string; slug: string };
}

export default function PromotionsPage() {
  const navigate = useNavigate();
  const { data: rawOffers, isPending } = useOffers();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const offers = useMemo(() => (rawOffers as Offer[] | undefined) ?? [], [rawOffers]);

  const activeOffers = useMemo(
    () => offers.filter((o) => o.status && isActive(o.start_date, o.end_date)),
    [offers],
  );

  const expiringSoon = useMemo(
    () => activeOffers.filter((o) => daysUntil(o.end_date) <= 3),
    [activeOffers],
  );

  const handleCopy = useCallback((code: string) => {
    void navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Promotions & Offers</h1>
        <p className="mb-8 text-sm text-gray-400">Apply coupon codes at checkout to avail discounts.</p>

        {/* Expiring soon banner */}
        {expiringSoon.length > 0 && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-orange-50 border border-orange-200 px-4 py-3 text-sm text-orange-700">
            <Clock className="h-4 w-4" />
            <span>{expiringSoon.length} offer(s) expiring in the next 3 days!</span>
          </div>
        )}

        {isPending ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-200" />
            ))}
          </div>
        ) : activeOffers.length === 0 ? (
          <div className="py-20 text-center">
            <Tag className="mx-auto mb-3 h-10 w-10 text-gray-200" />
            <p className="text-gray-400">No active promotions right now.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {activeOffers.map((offer) => {
              const days = daysUntil(offer.end_date);
              const urgent = days <= 3;
              return (
                <div
                  key={offer.id}
                  className={`relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm ${urgent ? 'border-orange-300' : 'border-gray-100'}`}
                >
                  {/* Discount badge */}
                  <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    <Tag className="h-3 w-3" />
                    {offer.discount_type === 'percent'
                      ? `${offer.discount_value}% OFF`
                      : `₹${offer.discount_value} OFF`}
                  </div>

                  <h2 className="font-bold text-gray-800">{offer.title}</h2>
                  {offer.description && (
                    <p className="mt-1 text-xs text-gray-400">{offer.description}</p>
                  )}

                  {/* Expiry */}
                  <p className={`mt-2 flex items-center gap-1 text-xs ${urgent ? 'text-orange-600 font-semibold' : 'text-gray-400'}`}>
                    <Clock className="h-3 w-3" />
                    {urgent ? `Expires in ${days} day(s)!` : `Valid till ${formatDate(offer.end_date)}`}
                  </p>

                  {/* Coupon code + actions */}
                  <div className="mt-4 flex items-center gap-2">
                    {offer.coupon_code && (
                      <button
                        onClick={() => handleCopy(offer.coupon_code!)}
                        className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-1.5 text-xs font-mono font-medium text-gray-700 hover:bg-gray-100"
                      >
                        {copiedCode === offer.coupon_code ? (
                          <><CheckCheck className="h-3 w-3 text-green-500" /> Copied!</>
                        ) : (
                          <><Copy className="h-3 w-3" /> {offer.coupon_code}</>
                        )}
                      </button>
                    )}

                    {offer.category && (
                      <button
                        onClick={() => navigate(`/products?category=${offer.category!.slug}`)}
                        className="ml-auto rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        Shop Now →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
