import { cn } from "@/lib/cn";
import { type DicePhase } from "@/hooks/useDicePhase";
import { formatEth } from "@/lib/format";

const STYLES = {
  idle: "border-border text-foreground-muted bg-surface-elevated",
  active: "border-primary/40 text-primary bg-primary/5",
  pending: "border-warning/40 text-warning bg-warning/5",
  win: "border-primary text-primary bg-primary/10",
  loss: "border-danger/60 text-danger-bright bg-danger/10",
} as const;

export function PhasePill({ phase }: { phase: DicePhase }) {
  let label = "Idle — Ready to roll";
  let dotClass = "bg-foreground-subtle";
  let style = STYLES.idle;
  let pulse = false;

  switch (phase.kind) {
    case "confirm":
      label = "Confirm in wallet…";
      dotClass = "bg-foreground-muted";
      style = STYLES.active;
      pulse = true;
      break;
    case "broadcasting":
      label = "Broadcasting transaction…";
      dotClass = "bg-foreground-muted";
      style = STYLES.active;
      pulse = true;
      break;
    case "awaiting-vrf":
      label = "Awaiting VRF · ≈30s";
      dotClass = "bg-warning";
      style = STYLES.pending;
      pulse = true;
      break;
    case "won":
      label = `WON +${formatEth(phase.payout)} ETH`;
      dotClass = "bg-primary";
      style = STYLES.win;
      break;
    case "lost":
      label = "House wins this roll";
      dotClass = "bg-danger-bright";
      style = STYLES.loss;
      break;
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-4 h-9 rounded-full border text-sm font-sans whitespace-nowrap",
        style,
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          dotClass,
          pulse && "animate-pulse",
        )}
      />
      {label}
    </div>
  );
}
