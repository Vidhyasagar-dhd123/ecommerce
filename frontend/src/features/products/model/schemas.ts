import { z } from 'zod';

// ── Review form schema ─────────────────────────────────────────
export const reviewSchema = z.object({
  rating:  z.number({ required_error: 'Select a rating' }).min(1).max(5),
  comment: z.string().min(10, 'Minimum 10 characters').max(500, 'Maximum 500 characters'),
});

export type ReviewFormValues = z.infer<typeof reviewSchema>;
