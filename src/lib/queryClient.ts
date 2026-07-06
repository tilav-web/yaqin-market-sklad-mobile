import { QueryClient } from '@tanstack/react-query';

// Shared singleton so non-React code (e.g. the auth store on sign-out) can
// reach the same cache the QueryClientProvider serves.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60_000,
      gcTime: 5 * 60_000,
    },
  },
});
