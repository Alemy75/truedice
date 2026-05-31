"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { type DicePhase } from "@/hooks/useDicePhase";
import { NumberFlipDisplay } from "@/components/ui/NumberFlipDisplay";
import { PhasePill } from "@/components/ui/PhasePill";
import { cn } from "@/lib/cn";

interface DiceCanvasProps {
  phase: DicePhase;
  rollUnder: number;
}

export function DiceCanvas({ phase, rollUnder }: DiceCanvasProps) {
  const ref = useRef<HTMLDivElement>(null);
  const lastShownResult = useRef<number | null>(null);

  let value: number | null = null;
  let rolling = false;
  let tone: "neutral" | "win" | "loss" = "neutral";

  switch (phase.kind) {
    case "idle":
      value = null;
      break;
    case "confirm":
    case "broadcasting":
    case "awaiting-vrf":
      rolling = true;
      break;
    case "won":
      value = phase.result;
      tone = "win";
      break;
    case "lost":
      value = phase.result;
      tone = "loss";
      break;
  }

  // fire confetti once on win
  useEffect(() => {
    if (phase.kind === "won" && lastShownResult.current !== phase.result) {
      lastShownResult.current = phase.result;
      const rect = ref.current?.getBoundingClientRect();
      const origin = rect
        ? {
            x: (rect.left + rect.width / 2) / window.innerWidth,
            y: (rect.top + 100) / window.innerHeight,
          }
        : undefined;
      confetti({
        particleCount: 30,
        spread: 55,
        startVelocity: 28,
        gravity: 1.2,
        scalar: 0.8,
        ticks: 120,
        colors: ["#D4AF37", "#E5C76B", "#C9A961"],
        origin,
      });
    }
    if (phase.kind === "idle") {
      lastShownResult.current = null;
    }
  }, [phase]);

  const isIdle = phase.kind === "idle";

  return (
    <div
      ref={ref}
      className={cn(
        "relative bg-surface border border-border rounded-xl aspect-square flex flex-col items-center justify-center p-8 overflow-hidden transition-shadow duration-700",
        "shadow-[var(--shadow-gold-rim)]",
        tone === "win" &&
          "shadow-[var(--shadow-gold-rim-strong),var(--shadow-glow-primary)]",
        tone === "loss" &&
          "shadow-[var(--shadow-gold-rim),var(--shadow-glow-danger)]",
      )}
    >
      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 45%, rgba(212,175,55,0.05), transparent 72%)",
        }}
      />

      {/* Phase pill at top */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20">
        <PhasePill phase={phase} />
      </div>

      {/* Idle prompt */}
      {isIdle && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center pointer-events-none z-10 px-[24%]">
          <div className="eyebrow text-foreground-subtle">
            Awaiting your bet
          </div>
          <div className="font-display font-semibold text-foreground-muted leading-tight text-[clamp(22px,3vw,34px)]">
            Set your stake &amp; roll
          </div>
        </div>
      )}

      {/* Number */}
      {!isIdle && (
        <div className="relative z-10 flex flex-col items-center">
          <NumberFlipDisplay value={value} rolling={rolling} tone={tone} />
          {value !== null && (
            <div className="mt-6 space-y-1 text-center font-mono">
              <div className="text-base md:text-xl text-foreground">
                Result · {String(value).padStart(4, "0")} / 9999
              </div>
              <div className="text-sm md:text-lg text-foreground-muted">
                Win Under · {rollUnder}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
