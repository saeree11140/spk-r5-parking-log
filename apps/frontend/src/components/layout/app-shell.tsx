"use client";

import { House, LayoutDashboard, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/stores/dashboard-store";

const navigation = [
  { href: "/", icon: LayoutDashboard, label: "ภาพรวม" },
  { href: "/", icon: House, label: "รายชื่อบ้าน" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const collapsed = useDashboardStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useDashboardStore((state) => state.toggleSidebar);

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
              index === 0 ? pathname === "/" : pathname.startsWith("/houses/");
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
        </nav>
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
          <Link href="/">ภาพรวมบ้าน</Link>
        </nav>
      </header>
      <main className="app-content">{children}</main>
    </div>
  );
}
