import type { ReactNode } from "react";

export type StatusTone = "neutral" | "info" | "warning" | "danger" | "success";

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: StatusTone;
}) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>;
}
