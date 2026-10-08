import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/format";
import { Icon, type IconName } from "./Icon";

type Variant = "primary" | "secondary" | "tertiary" | "danger" | "link";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: IconName;
  iconRight?: IconName;
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover border border-transparent",
  secondary: "bg-surface text-text border border-border-strong hover:bg-surface-muted",
  tertiary: "bg-transparent text-text hover:bg-surface-muted border border-transparent",
  danger: "bg-danger text-white hover:opacity-90 border border-transparent",
  link: "bg-transparent text-primary hover:underline border border-transparent px-0",
};

const SIZES: Record<Size, string> = {
  sm: "h-7 px-2.5 text-body-sm gap-1.5",
  md: "h-9 px-3.5 text-body gap-2",
  lg: "h-11 px-5 text-body gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, icon, iconRight, children, className, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cx(
        "inline-flex items-center justify-center rounded-sm font-medium transition-colors whitespace-nowrap",
        "disabled:opacity-50 disabled:pointer-events-none",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      ) : (
        icon && <Icon name={icon} size={size === "sm" ? 16 : 18} />
      )}
      {children}
      {iconRight && !loading && <Icon name={iconRight} size={size === "sm" ? 16 : 18} />}
    </button>
  );
});
