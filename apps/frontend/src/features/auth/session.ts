import type { QueryClient } from "@tanstack/react-query";

import { authApi } from "@/lib/api/auth-api";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Resolves the auth store out of "checking" by asking the API who is signed
 * in. Route guards await this, so no protected page renders before the
 * session is known. Concurrent calls share one /auth/me request.
 */
export async function ensureSession(queryClient: QueryClient): Promise<void> {
  if (useAuthStore.getState().status !== "checking") return;

  try {
    const user = await queryClient.fetchQuery({
      queryKey: queryKeys.auth,
      queryFn: authApi.me,
      staleTime: 0,
    });
    useAuthStore.getState().setAuthenticated(user);
  } catch {
    useAuthStore.getState().setUnauthenticated();
  }
}
