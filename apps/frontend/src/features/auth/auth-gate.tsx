import { useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { useAuthStore } from "@/stores/auth-store";

const LOGIN_PATH = "/login";
const CHANGE_PASSWORD_PATH = "/change-password";

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const navigate = useNavigate();
  const { status, user } = useAuthStore();

  let destination: string | null = null;
  if (status === "unauthenticated" && pathname !== LOGIN_PATH) {
    destination = LOGIN_PATH;
  } else if (
    status === "authenticated" &&
    user?.mustChangePassword &&
    pathname !== CHANGE_PASSWORD_PATH
  ) {
    destination = CHANGE_PASSWORD_PATH;
  } else if (
    status === "authenticated" &&
    !user?.mustChangePassword &&
    (pathname === LOGIN_PATH || pathname === CHANGE_PASSWORD_PATH)
  ) {
    destination = "/";
  }

  useEffect(() => {
    if (destination) void navigate({ to: destination, replace: true });
  }, [destination, navigate]);

  if (status === "checking" || destination) {
    return (
      <div className="auth-bootstrap" role="status">
        กำลังตรวจสอบสิทธิ์
      </div>
    );
  }

  if (pathname === LOGIN_PATH || pathname === CHANGE_PASSWORD_PATH) {
    return children;
  }

  return <AppShell>{children}</AppShell>;
}
