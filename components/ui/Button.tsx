import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

// Mirrors claude-design-layouts/styles.css `.btn-*` exactly.
type Variant = "primary" | "secondary" | "ghost" | "ghost-gold" | "danger";
type Size = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Force no gold-rim on primary (primary has it by default). */
  noGoldRim?: boolean;
  /** Force glow on hover (primary already glows on hover). */
  glow?: boolean;
  /** Full width. */
  block?: boolean;
  /** @deprecated primary has gold-rim by default now. No-op kept for backwards compatibility. */
  goldRim?: boolean;
}

const VARIANT: Record<Variant, string> = {
  // primary: gold bg, near-black text, gold-rim by default, glow on hover
  primary:
    "bg-primary text-primary-foreground font-semibold " +
    "shadow-[var(--shadow-gold-rim)] " +
    "hover:bg-primary-hover hover:shadow-[var(--shadow-gold-rim),var(--shadow-glow-primary)] " +
    "active:bg-primary-pressed " +
    "disabled:opacity-50 disabled:hover:shadow-[var(--shadow-gold-rim)] disabled:hover:bg-primary",
  // secondary: surface-overlay bg, inset border, warm hover
  secondary:
    "bg-surface-overlay text-foreground font-semibold " +
    "shadow-[inset_0_0_0_1px_var(--color-border)] " +
    "hover:bg-[#2f2922] hover:shadow-[inset_0_0_0_1px_var(--color-border-gold)]",
  // ghost: transparent, muted text, hover → gold
  ghost:
    "bg-transparent text-foreground-muted font-semibold hover:text-primary",
  // ghost-gold: gold-rim outline + gold text, subtle gold fill on hover
  "ghost-gold":
    "bg-transparent text-primary font-semibold " +
    "shadow-[inset_0_0_0_1px_var(--color-border-gold)] " +
    "hover:bg-[rgba(212,175,55,0.06)] hover:shadow-[inset_0_0_0_1px_var(--color-primary)]",
  danger:
    "bg-danger text-foreground font-semibold hover:bg-[#a03434]",
};

const SIZE: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-base",
  lg: "h-[52px] px-7 text-lg",
  xl: "h-16 px-8 text-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", noGoldRim, glow, block, goldRim: _goldRim, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md whitespace-nowrap select-none",
          "transition-[background,color,box-shadow,opacity,transform] duration-150 ease-out",
          "disabled:cursor-not-allowed",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
          VARIANT[variant],
          SIZE[size],
          block && "w-full",
          variant === "primary" && noGoldRim && "shadow-none",
          glow && variant !== "primary" && "hover:shadow-[var(--shadow-glow-primary)]",
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
