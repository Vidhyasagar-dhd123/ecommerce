import { useEffect, useState } from 'react';

/**
 * Debounces a value by `delay` ms.
 * Use for search inputs to avoid firing an API call on every keystroke.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer); // cleanup on each change
  }, [value, delay]);

  return debounced;
}
