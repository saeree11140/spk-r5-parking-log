import type { LucideIcon } from "lucide-react";
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  icon?: LucideIcon;
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      className = "",
      icon: Icon,
      type = "button",
      variant = "secondary",
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={`button button--${variant} ${className}`.trim()}
        type={type}
        {...props}
      >
        {Icon ? <Icon aria-hidden="true" size={18} strokeWidth={2} /> : null}
        {children}
      </button>
    );
  },
);
