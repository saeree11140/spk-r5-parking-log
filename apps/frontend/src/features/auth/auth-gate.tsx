"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { useAuthStore } from "@/stores/auth-store";

const LOGIN_PATH = "/login";
const CHANGE_PASSWORD_PATH = "/change-password";

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
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
    if (destination) router.replace(destination);
  }, [destination, router]);

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
