import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';

import { reviewSchema, type ReviewFormValues } from '../model/schemas';
import { StarInput } from './StarInput';
import type { Review } from '../model/types';

interface ReviewFormProps {
  reviewMutation: UseMutationResult<Review, Error, ReviewFormValues>;
}

/** Write-a-review form that posts via the provided mutation */
export function ReviewForm({ reviewMutation }: ReviewFormProps) {
  const {
    register, handleSubmit, setValue, watch, reset,
    formState: { errors, isSubmitting },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 0, comment: '' },
  });

  const ratingValue = watch('rating');

  const onSubmit = useCallback(
    (data: ReviewFormValues) => {
      reviewMutation.mutate(data, { onSuccess: () => reset() });
    },
    [reviewMutation, reset],
  );

  return (
    <div
      className="rounded-2xl border p-6"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
    >
      <h3 className="mb-4 font-semibold" style={{ color: 'var(--color-text)' }}>
        Write a Review
      </h3>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Star rating */}
        <div>
          <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Rating
          </label>
          <StarInput
            value={ratingValue}
            onChange={(v) => setValue('rating', v, { shouldValidate: true })}
          />
          {errors.rating && (
            <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>
              {errors.rating.message}
            </p>
          )}
        </div>

        {/* Comment */}
        <div>
          <label
            htmlFor="review-comment"
            className="mb-1 block text-sm font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Comment
          </label>
          <textarea
            id="review-comment"
            {...register('comment')}
            rows={4}
            placeholder="Share your experience…"
            className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors duration-150"
            style={{
              borderColor: errors.comment ? 'var(--color-danger)' : 'var(--color-border)',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = errors.comment ? 'var(--color-danger)' : 'var(--color-border)')}
          />
          {errors.comment && (
            <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>
              {errors.comment.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || reviewMutation.isPending}
          className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-opacity duration-150 disabled:opacity-50"
          style={{ background: 'var(--color-primary)' }}
        >
          {reviewMutation.isPending ? 'Submitting…' : 'Submit Review'}
        </button>
      </form>
    </div>
  );
}
