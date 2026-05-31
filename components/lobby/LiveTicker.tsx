"use client";

import { useBetEvents } from "@/hooks/useBetEvents";
import { AddressChip } from "@/components/ui/AddressChip";
import { formatEth, formatRelativeTime } from "@/lib/format";

export function LiveTicker() {
  const events = useBetEvents();
  const wins = events
    .filter((e) => e.settled && e.won && e.payout && e.payout > 0n)
    .slice(0, 20);

  if (wins.length === 0) return null;

  // Duplicate for seamless marquee loop
  const items = [...wins, ...wins];

  return (
    <section
      className="bg-surface border-y border-border-subtle py-[22px] overflow-hidden"
      style={{
        WebkitMaskImage:
          "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
        maskImage:
          "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
      }}
      aria-label="Recent winners"
    >
      <div className="animate-marquee">
        {items.map((e, i) => {
          const big = e.payout && e.payout >= 1_000_000_000_000_000_000n; // ≥1 ETH
          return (
            <span
              key={`${e.requestId.toString()}-${i}`}
              className="inline-flex items-center gap-2 px-9 text-sm"
            >
              <AddressChip address={e.player} showCopy={false} />
              <span className="text-foreground-subtle">won</span>
              <span
                className={
                  big
                    ? "font-mono text-primary"
                    : "font-mono text-foreground"
                }
              >
                +{formatEth(e.payout!)} ETH
              </span>
              <span className="text-foreground-subtle">on</span>
              <span>Dice</span>
              <span className="text-foreground-subtle">·</span>
              <span className="font-mono text-foreground-subtle">
                {formatRelativeTime(e.timestamp)}
              </span>
            </span>
          );
        })}
      </div>
    </section>
  );
}
