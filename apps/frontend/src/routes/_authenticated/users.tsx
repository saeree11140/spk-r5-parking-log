import { createFileRoute, redirect } from "@tanstack/react-router";

import { UsersPage } from "@/features/users/users-page";
import { useAuthStore } from "@/stores/auth-store";

export const Route = createFileRoute("/_authenticated/users")({
  beforeLoad: () => {
    if (useAuthStore.getState().user?.role !== "ADMIN") {
      throw redirect({ to: "/", replace: true });
    }
  },
  component: UsersPage,
});
