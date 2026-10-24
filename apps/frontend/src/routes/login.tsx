import { createFileRoute, redirect } from "@tanstack/react-router";

import { LoginPage } from "@/features/auth/login-page";
import { useAuthStore } from "@/stores/auth-store";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    const { user } = useAuthStore.getState();
    if (!user) return;
    throw redirect({
      to: user.mustChangePassword ? "/change-password" : "/",
      replace: true,
    });
  },
  component: LoginPage,
});
