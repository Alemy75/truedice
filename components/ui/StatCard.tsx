import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface StatCardProps {
  label: string;
  value: ReactNode;
  tone?: "neutral" | "primary";
}

export function StatCard({ label, value, tone = "neutral" }: StatCardProps) {
  return (
    <div className="text-center space-y-2.5">
      <div className="eyebrow">{label}</div>
      <div
        className={cn(
          "font-display font-bold tabular-nums whitespace-nowrap",
          "text-3xl md:text-[38px] tracking-[0.01em]",
          tone === "primary" ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}
