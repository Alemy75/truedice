"use client";

import { useRef, type ChangeEvent } from "react";
import { cn } from "@/lib/cn";

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  className,
}: SliderProps) {
  const ref = useRef<HTMLInputElement>(null);
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn("relative w-full h-6 flex items-center", className)}>
      <div className="absolute inset-x-0 h-1.5 bg-border-subtle rounded-full overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onChange(Number(e.target.value))
        }
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <div
        className="absolute w-6 h-6 rounded-full bg-surface-overlay border-2 border-primary shadow-lg pointer-events-none"
        style={{
          left: `calc(${pct}% - 12px)`,
        }}
      />
    </div>
  );
}
