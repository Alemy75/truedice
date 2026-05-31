import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ProofStepProps {
  step: number;
  title: string;
  children: ReactNode;
}

export function ProofStep({ step, title, children }: ProofStepProps) {
  return (
    <section className="bg-surface border border-border rounded-lg p-8">
      <div className="eyebrow mb-5">
        Step {step} · {title}
      </div>
      <div className="flex flex-col gap-3.5">{children}</div>
    </section>
  );
}

interface KVProps {
  label: string;
  value: ReactNode;
  wrap?: boolean;
  className?: string;
}

export function KV({ label, value, wrap = false, className }: KVProps) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-5",
        wrap && "flex-col items-start gap-1",
        className,
      )}
    >
      <span className="text-sm text-foreground-muted whitespace-nowrap">
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-[15px] text-foreground text-right",
          wrap ? "break-all text-left w-full" : "whitespace-nowrap",
        )}
      >
        {value}
      </span>
    </div>
  );
}
