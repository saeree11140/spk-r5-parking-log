"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  House,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api/auth-api";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { useDashboardStore } from "@/stores/dashboard-store";

const navigation = [
  { href: "/", icon: LayoutDashboard, label: "ภาพรวม" },
  { href: "/houses", icon: House, label: "รายชื่อบ้าน" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const collapsed = useDashboardStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useDashboardStore((state) => state.toggleSidebar);
  const user = useAuthStore((state) => state.user);
  const setUnauthenticated = useAuthStore((state) => state.setUnauthenticated);
  const logout = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      setUnauthenticated();
      queryClient.removeQueries({ queryKey: queryKeys.auth });
      queryClient.removeQueries({ queryKey: queryKeys.users });
      queryClient.removeQueries({ queryKey: queryKeys.houses });
      router.replace("/login");
    },
  });

  return (
    <div className={`app-shell ${collapsed ? "app-shell--collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            P
          </span>
          <span className="brand-copy">
            <strong>SPK R5</strong>
            <small>Parking Log</small>
          </span>
        </div>
        <nav aria-label="เมนูหลัก" className="sidebar-nav">
          {navigation.map(({ href, icon: Icon, label }, index) => {
            const active =
              index === 0
                ? pathname === "/"
                : pathname === "/houses" || pathname.startsWith("/houses/");
            return (
              <Link
                key={label}
                aria-current={active ? "page" : undefined}
                className={active ? "nav-link nav-link--active" : "nav-link"}
                href={href}
              >
                <Icon aria-hidden="true" size={20} />
                <span>{label}</span>
              </Link>
            );
          })}
          {user?.role === "ADMIN" ? (
            <Link
              aria-current={pathname.startsWith("/users") ? "page" : undefined}
              className={
                pathname.startsWith("/users")
                  ? "nav-link nav-link--active"
                  : "nav-link"
              }
              href="/users"
            >
              <Users aria-hidden="true" size={20} />
              <span>ผู้ใช้งาน</span>
            </Link>
          ) : null}
        </nav>
        <div className="sidebar-user">
          <span className="user-avatar" aria-hidden="true">
            {user?.displayName.slice(0, 1) ?? "?"}
          </span>
          <span className="sidebar-user-copy">
            <strong>{user?.displayName}</strong>
            <small>{user?.role}</small>
          </span>
        </div>
        <Button
          aria-label="ออกจากระบบ"
          className="sidebar-logout"
          disabled={logout.isPending}
          icon={LogOut}
          onClick={() => logout.mutate()}
          variant="ghost"
        >
          <span>{logout.isPending ? "กำลังออก..." : "ออกจากระบบ"}</span>
        </Button>
        {logout.isError ? (
          <p className="sidebar-error" role="alert">
            ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง
          </p>
        ) : null}
        <Button
          aria-label={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
          className="sidebar-toggle"
          icon={collapsed ? PanelLeftOpen : PanelLeftClose}
          onClick={toggleSidebar}
          variant="ghost"
        >
          <span>{collapsed ? "" : "ย่อเมนู"}</span>
        </Button>
      </aside>
      <header className="mobile-header">
        <Link className="mobile-brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            P
          </span>
          <strong>SPK R5 Parking Log</strong>
        </Link>
        <nav aria-label="เมนูมือถือ">
          {user?.role === "ADMIN" ? <Link href="/users">ผู้ใช้งาน</Link> : null}
          <Button
            aria-label="ออกจากระบบ"
            disabled={logout.isPending}
            icon={LogOut}
            onClick={() => logout.mutate()}
            variant="ghost"
          />
        </nav>
      </header>
      <main className="app-content">{children}</main>
    </div>
  );
}
