import type { Review } from '../model/types';
import { StarRating } from './StarRating';
import { formatDateTime } from '@utils/formatDate';

interface ReviewListProps {
  reviews: Review[];
}

/** Displays the list of customer reviews below the product details */
export function ReviewList({ reviews }: ReviewListProps) {
  if (!reviews.length) {
    return (
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        No reviews yet. Be the first!
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div
          key={review.id}
          className="rounded-xl border p-4"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
        >
          <div className="flex items-center gap-2">
            <StarRating value={review.rating} />
            {review.created_at && (
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {formatDateTime(review.created_at)}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {review.comment}
          </p>
        </div>
      ))}
    </div>
  );
}
