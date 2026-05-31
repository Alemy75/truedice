import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: "sm" | "lg";
  suffix?: ReactNode;
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, size = "lg", suffix, error, ...props }, ref) => {
    return (
      <div
        className={cn(
          "relative flex items-center bg-surface-overlay border border-border rounded-md transition-colors focus-within:border-primary",
          error && "border-danger focus-within:border-danger",
          size === "lg" ? "h-14" : "h-10",
        )}
      >
        <input
          ref={ref}
          className={cn(
            "flex-1 min-w-0 bg-transparent text-foreground font-mono tabular-nums focus:outline-none placeholder:text-foreground-subtle",
            size === "lg" ? "text-2xl px-4" : "text-base px-3",
            suffix ? "pr-2" : "",
            className,
          )}
          {...props}
        />
        {suffix && (
          <span className="text-foreground-muted font-sans text-sm pr-4">
            {suffix}
          </span>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
