import { AlertCircle, CheckCircle2, Inbox } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "./button";

export function LoadingState({
  label = "กำลังโหลดข้อมูล",
}: {
  label?: string;
}) {
  return (
    <div aria-label={label} aria-live="polite" className="loading-state" role="status">
      <span className="skeleton skeleton--title" />
      <span className="skeleton" />
      <span className="skeleton" />
    </div>
  );
}

export function EmptyState({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="feedback-state">
      <Inbox aria-hidden="true" size={28} />
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </section>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <section className="feedback-state feedback-state--error" role="alert">
      <AlertCircle aria-hidden="true" size={28} />
      <h2>โหลดข้อมูลไม่สำเร็จ</h2>
      <p>{message}</p>
      {onRetry ? (
        <Button onClick={onRetry} variant="secondary">
          ลองใหม่
        </Button>
      ) : null}
    </section>
  );
}

export function SuccessNotice({ children }: { children: ReactNode }) {
  return (
    <div className="success-notice" role="status">
      <CheckCircle2 aria-hidden="true" size={20} />
      {children}
    </div>
  );
}
