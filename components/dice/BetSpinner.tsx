"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import type { DicePhase } from "@/hooks/useDicePhase";

declare global {
  interface Window {
    CasinoSpinner: new (
      canvas: HTMLCanvasElement,
      opts?: SpinnerOptions,
    ) => SpinnerInstance;
  }
}

interface SpinnerOptions {
  style?: "pixel" | "illustrated";
  pixelRes?: number;
  speed?: number;
  autoplay?: boolean;
  colors?: Record<string, string>;
}

interface SpinnerInstance {
  start: () => void;
  stop: () => void;
  toggle: () => boolean;
  setStyle: (style: "pixel" | "illustrated") => void;
  setColors: (colors: Record<string, string>) => void;
  destroy: () => void;
  baseSpeed?: number;
  pixelRes?: number;
}

// Gold palette aligned with --color-primary token (#D4AF37) + surrounding
// hues. Designed to blend with the canvas-card warm background.
const GOLD_PALETTE: Record<string, string> = {
  dieLight: "#FBE07A",
  dieMid: "#E3A92A",
  dieDark: "#8F5E12",
  pip: "#3A2206",
  coinLight: "#FFE98C",
  coinMid: "#E8B22E",
  coinDark: "#9C6B12",
  coinRim: "#7A4F0E",
  leaf: "#7BC62E",
  leafMid: "#4E9E22",
  leafDark: "#256A18",
  glow: "#FFB733",
  accent: "#F2C14E",
};

/**
 * Casino-themed canvas spinner. Embedded inside the dice canvas card as
 * an animated replacement for the static palm-tree backdrop (.dice-frame).
 *
 * Lifecycle wired to DicePhase:
 *   idle               → gentle "breathing" rotation at base speed
 *   confirm/broadcast  → full spin speed
 *   awaiting-vrf       → full spin speed (the wait phase)
 *   won / lost         → smooth wobble-down (spinner.stop()) while result
 *                        celebration plays
 *
 * Uses next/script to load /casino-spinner.js once across the page.
 * Multiple <BetSpinner> instances safely share the same global class.
 */
export function BetSpinner({ phase }: { phase: DicePhase }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spinnerRef = useRef<SpinnerInstance | null>(null);
  const scriptReadyRef = useRef(false);

  // Try to init when (a) script is loaded and (b) canvas is in the DOM.
  function tryInit() {
    if (spinnerRef.current) return;
    if (!scriptReadyRef.current) return;
    if (!canvasRef.current) return;
    if (typeof window === "undefined" || !window.CasinoSpinner) return;

    const inst = new window.CasinoSpinner(canvasRef.current, {
      style: "pixel",
      pixelRes: 56,
      speed: 1,
      autoplay: true, // gentle breathing on mount
      colors: GOLD_PALETTE,
    });
    spinnerRef.current = inst;
    // Drive initial state in case phase isn't idle on first render
    syncToPhase(inst, phase);
  }

  // Phase → spinner state synchronizer
  function syncToPhase(inst: SpinnerInstance, p: DicePhase) {
    switch (p.kind) {
      case "confirm":
      case "broadcasting":
      case "awaiting-vrf":
        inst.start();
        break;
      case "won":
      case "lost":
      case "idle":
      default:
        inst.stop();
        break;
    }
  }

  useEffect(() => {
    if (spinnerRef.current) syncToPhase(spinnerRef.current, phase);
  }, [phase]);

  useEffect(() => {
    return () => {
      spinnerRef.current?.destroy();
      spinnerRef.current = null;
    };
  }, []);

  return (
    <>
      <Script
        src="/casino-spinner.js"
        strategy="afterInteractive"
        onReady={() => {
          scriptReadyRef.current = true;
          tryInit();
        }}
      />
      <canvas
        ref={canvasRef}
        className="bet-spinner-canvas"
        aria-hidden
      />
    </>
  );
}
