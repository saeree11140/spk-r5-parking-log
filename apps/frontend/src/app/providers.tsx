"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { AuthProvider } from "@/features/auth/auth-provider";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
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
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
