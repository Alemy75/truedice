"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Tab {
  key: string;
  label: ReactNode;
  content: ReactNode;
}

export function Tabs({
  tabs,
  initialKey,
}: {
  tabs: Tab[];
  initialKey?: string;
}) {
  const [active, setActive] = useState(initialKey ?? tabs[0]?.key);
  const current = tabs.find((t) => t.key === active);

  return (
    <div>
      <div className="flex items-center gap-1 px-3 pt-2 border-b border-border-subtle flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={cn(
              "relative px-4 py-3 text-sm font-sans transition-colors",
              active === t.key
                ? "text-foreground"
                : "text-foreground-muted hover:text-primary",
            )}
          >
            {t.label}
            {active === t.key && (
              <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>
      <div>{current?.content}</div>
    </div>
  );
}
