import { createFileRoute, redirect } from "@tanstack/react-router";

import { ChangePasswordPage } from "@/features/auth/change-password-page";
import { useAuthStore } from "@/stores/auth-store";

export const Route = createFileRoute("/change-password")({
  beforeLoad: () => {
    const { user } = useAuthStore.getState();
    if (!user) throw redirect({ to: "/login", replace: true });
    if (!user.mustChangePassword) throw redirect({ to: "/", replace: true });
  },
  component: ChangePasswordPage,
});
