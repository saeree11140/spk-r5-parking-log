import { createFileRoute } from "@tanstack/react-router";

import { ChangePasswordPage } from "@/features/auth/change-password-page";

export const Route = createFileRoute("/change-password")({
  component: ChangePasswordPage,
});
