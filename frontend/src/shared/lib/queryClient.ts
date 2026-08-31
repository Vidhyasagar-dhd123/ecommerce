import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,       // 2 min — fresh enough for catalog data
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
