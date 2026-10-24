import { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { AuthProvider } from "@/features/auth/auth-provider";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: {
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          const statusCode =
            typeof error === "object" &&
            error !== null &&
            "statusCode" in error
              ? error.statusCode
              : null;
          return typeof statusCode === "number" && statusCode < 500
            ? false
            : failureCount < 1;
        },
      },
    },
  });
}

/** App-wide providers that sit inside QueryClientProvider. */
export function AppProviders({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
