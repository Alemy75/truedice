"use client";

import { useMemo } from "react";
import { useBetEvents } from "@/hooks/useBetEvents";
import { StatCard } from "@/components/ui/StatCard";
import { formatEth } from "@/lib/format";

export function StatsBar() {
  const events = useBetEvents();

  const stats = useMemo(() => {
    let totalWagered = 0n;
    let biggestWin24h = 0n;
    let settled = 0;
    const cutoff = Date.now() / 1000 - 86400;

    for (const e of events) {
      totalWagered += e.stake;
      if (e.settled) {
        settled++;
        if (
          e.won &&
          e.timestamp >= cutoff &&
          e.payout !== undefined &&
          e.payout > biggestWin24h
        ) {
          biggestWin24h = e.payout;
        }
      }
    }
    return { totalWagered, biggestWin24h, settled };
  }, [events]);

  return (
    <section className="bg-surface border border-border-subtle rounded-lg py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border-subtle">
        <div className="px-8 py-6 md:py-0">
          <StatCard
            label="Total Wagered"
            value={`${formatEth(stats.totalWagered, 4)} ETH`}
          />
        </div>
        <div className="px-8 py-6 md:py-0">
          <StatCard
            label="Bets Settled"
            value={stats.settled.toLocaleString()}
          />
        </div>
        <div className="px-8 py-6 md:py-0">
          <StatCard
            label="Biggest Win · 24h"
            value={`+${formatEth(stats.biggestWin24h, 4)} ETH`}
            tone="primary"
          />
        </div>
      </div>
    </section>
  );
}
