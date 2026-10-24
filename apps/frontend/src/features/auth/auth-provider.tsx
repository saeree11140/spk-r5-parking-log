import { useQueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";

import { registerAuthExpiredHandler } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const setUnauthenticated = useAuthStore((state) => state.setUnauthenticated);
  const setChecking = useAuthStore((state) => state.setChecking);

  useEffect(
    () =>
      registerAuthExpiredHandler(() => {
        setUnauthenticated();
        queryClient.removeQueries({ queryKey: queryKeys.auth });
        queryClient.removeQueries({ queryKey: queryKeys.users });
        queryClient.removeQueries({ queryKey: queryKeys.houses });
      }),
    [queryClient, setUnauthenticated],
  );

  // A page restored from the back-forward cache still holds the state it
  // had before the user left, possibly from before a logout.
  useEffect(() => {
    function recheckRestoredPage(event: PageTransitionEvent) {
      if (!event.persisted) return;
      queryClient.removeQueries({ queryKey: queryKeys.auth });
      setChecking();
    }

    window.addEventListener("pageshow", recheckRestoredPage);
    return () => window.removeEventListener("pageshow", recheckRestoredPage);
  }, [queryClient, setChecking]);

  return children;
}
