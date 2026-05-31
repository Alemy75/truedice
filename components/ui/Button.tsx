import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  goldRim?: boolean;
  glow?: boolean;
}

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed disabled:opacity-50 font-semibold",
  secondary:
    "bg-surface-overlay text-foreground hover:bg-surface-elevated border border-border",
  ghost:
    "bg-transparent text-foreground-muted hover:text-primary hover:bg-surface/50",
  danger:
    "bg-danger text-foreground hover:opacity-90",
};

const SIZE: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
  xl: "h-16 px-8 text-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", goldRim, glow, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md transition-all duration-150 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
          VARIANT[variant],
          SIZE[size],
          goldRim && "shadow-[var(--shadow-gold-rim)]",
          glow && "hover:shadow-[var(--shadow-glow-primary)]",
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
