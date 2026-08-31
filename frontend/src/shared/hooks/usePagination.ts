import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

/**
 * URL-synced pagination state.
 * page lives in the URL → shareable & bookmarkable (docs/06 §1).
 */
export function usePagination(defaultPageSize = 12) {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = useMemo(() => {
    const p = parseInt(searchParams.get('page') ?? '1', 10);
    return isNaN(p) || p < 1 ? 1 : p;
  }, [searchParams]);

  const setPage = useCallback(
    (newPage: number) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('page', String(newPage));
          return next;
        },
        { replace: true }, // no back-stack spam
      );
    },
    [setSearchParams],
  );

  return { page, pageSize: defaultPageSize, setPage };
}
