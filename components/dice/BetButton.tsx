"use client";

import { Button } from "@/components/ui/Button";
import { type DicePhase } from "@/hooks/useDicePhase";

interface BetButtonProps {
  phase: DicePhase;
  disabled: boolean;
  onClick: () => void;
}

export function BetButton({ phase, disabled, onClick }: BetButtonProps) {
  const isInFlight =
    phase.kind === "confirm" ||
    phase.kind === "broadcasting" ||
    phase.kind === "awaiting-vrf";

  let label = "ROLL DICE";
  if (phase.kind === "confirm") label = "CONFIRM IN WALLET";
  if (phase.kind === "broadcasting") label = "BROADCASTING…";
  if (phase.kind === "awaiting-vrf") label = "AWAITING RANDOMNESS";

  return (
    <Button
      size="xl"
      variant="primary"
      goldRim
      glow
      onClick={onClick}
      disabled={disabled || isInFlight}
      className="w-full font-bold uppercase tracking-wide"
    >
      {label}
    </Button>
  );
}
