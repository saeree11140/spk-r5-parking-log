import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  Outlet,
  useRouter,
} from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { AuthBootstrap } from "@/features/auth/auth-bootstrap";
import { ensureSession } from "@/features/auth/session";
import { useAuthStore } from "@/stores/auth-store";

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: ({ context }) => ensureSession(context.queryClient),
  pendingComponent: AuthBootstrap,
  component: RootLayout,
});

function RootLayout() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const previousStatus = useRef(status);

  // Re-run the route guards whenever the session changes outside a
  // navigation: expiry, logout in this tab, or a back-forward cache restore.
  useEffect(() => {
    if (previousStatus.current === status) return;
    previousStatus.current = status;
    void router.invalidate();
  }, [router, status]);

  if (status === "checking") return <AuthBootstrap />;
  return <Outlet />;
}
