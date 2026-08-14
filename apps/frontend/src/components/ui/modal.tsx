"use client";

import { X } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";

import { Button } from "./button";

interface ModalProps {
  children: ReactNode;
  footer?: ReactNode;
  initialFocus?: string;
  onClose: () => void;
  open: boolean;
  pending?: boolean;
  returnFocusRef?: RefObject<HTMLElement | null>;
  title: string;
}

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[href]",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function Modal({
  children,
  footer,
  initialFocus,
  onClose,
  open,
  pending = false,
  returnFocusRef,
  title,
}: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    const returnFocusElement =
      returnFocusRef?.current ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);
    const preferred = initialFocus
      ? panel?.querySelector<HTMLElement>(initialFocus)
      : null;
    const firstFocusable =
      preferred ??
      panel?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
      panel;
    firstFocusable?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (
        !panel ||
        !(event.target instanceof Node) ||
        !panel.contains(event.target)
      ) {
        return;
      }

      if (event.key === "Escape") {
        if (!pending) onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      returnFocusElement?.focus();
    };
  }, [initialFocus, onClose, open, pending, returnFocusRef]);

  if (!open) return null;

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && !pending) onClose();
  }

  return (
    <div className="modal-backdrop" onMouseDown={handleBackdropClick}>
      <div
        ref={panelRef}
        aria-labelledby={titleId}
        aria-modal="true"
        className="modal-panel"
        role="dialog"
        tabIndex={-1}
      >
        <header className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <Button
            aria-label="ปิด"
            disabled={pending}
            icon={X}
            onClick={onClose}
            variant="ghost"
          />
        </header>
        <div className="modal-content">{children}</div>
        {footer ? <footer className="modal-footer">{footer}</footer> : null}
      </div>
    </div>
  );
}
