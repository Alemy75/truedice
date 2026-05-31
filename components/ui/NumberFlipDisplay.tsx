"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

interface NumberFlipDisplayProps {
  value: number | null; // null → idle "————"
  rolling: boolean; // true → cycle digits
  tone?: "neutral" | "win" | "loss";
  className?: string;
}

export function NumberFlipDisplay({
  value,
  rolling,
  tone = "neutral",
  className,
}: NumberFlipDisplayProps) {
  const [display, setDisplay] = useState<string>(
    value === null ? "————" : String(value).padStart(4, "0"),
  );

  useEffect(() => {
    if (!rolling) {
      setDisplay(value === null ? "————" : String(value).padStart(4, "0"));
      return;
    }
    const id = setInterval(() => {
      setDisplay(
        Math.floor(Math.random() * 10000)
          .toString()
          .padStart(4, "0"),
      );
    }, 50);
    return () => clearInterval(id);
  }, [rolling, value]);

  return (
    <span
      className={cn(
        "font-display font-bold leading-none tracking-tight tabular-nums select-none transition-colors duration-500",
        "text-[clamp(82px,14vw,140px)]",
        tone === "win" &&
          "text-primary drop-shadow-[0_2px_22px_rgba(212,175,55,0.55)]",
        tone === "loss" && "text-foreground",
        tone === "neutral" && !rolling && "text-foreground",
        rolling && "text-foreground-muted",
        className,
      )}
    >
      {display}
    </span>
  );
}
