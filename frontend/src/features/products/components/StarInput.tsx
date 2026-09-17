import { Star } from 'lucide-react';

interface StarInputProps {
  value: number;
  onChange: (v: number) => void;
}

/**
 * Interactive star rating picker for forms.
 * For read-only display, use StarRating instead.
 */
export function StarInput({ value, onChange }: StarInputProps) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star`}
          onClick={() => onChange(star)}
          className="focus:outline-none"
        >
          <Star
            className={`h-6 w-6 transition-colors duration-100 ${
              star <= value
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300 hover:text-yellow-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}
