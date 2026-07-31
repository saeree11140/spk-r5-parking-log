"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";

import { authApi } from "@/lib/api/auth-api";
import { registerAuthExpiredHandler } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const status = useAuthStore((state) => state.status);
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const setUnauthenticated = useAuthStore((state) => state.setUnauthenticated);
  const setChecking = useAuthStore((state) => state.setChecking);

  const currentUser = useQuery({
    queryKey: queryKeys.auth,
    queryFn: authApi.me,
    retry: false,
  });

  useEffect(() => {
    setChecking();
  }, [setChecking]);

  useEffect(() => {
    if (currentUser.data) setAuthenticated(currentUser.data);
    else if (currentUser.isError) setUnauthenticated();
  }, [
    currentUser.data,
    currentUser.isError,
    setAuthenticated,
    setUnauthenticated,
  ]);

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

  if (currentUser.isPending || status === "checking") {
    return (
      <div role="status" aria-live="polite">
        กำลังตรวจสอบสิทธิ์
      </div>
    );
  }

  return children;
}
