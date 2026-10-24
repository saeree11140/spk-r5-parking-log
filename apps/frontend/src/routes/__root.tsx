import { createRootRoute, Outlet } from "@tanstack/react-router";

import { AuthGate } from "@/features/auth/auth-gate";

export const Route = createRootRoute({
  component: () => (
    <AuthGate>
      <Outlet />
    </AuthGate>
  ),
});
