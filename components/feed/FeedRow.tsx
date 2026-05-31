import Link from "next/link";
import { Check, X, ExternalLink } from "lucide-react";
import { AddressChip } from "@/components/ui/AddressChip";
import { type BetEvent } from "@/hooks/useBetEvents";
import {
  formatEth,
  formatPercentBps,
  formatRelativeTime,
} from "@/lib/format";
import { type Column } from "@/components/ui/DataTable";

export function feedColumns(showPlayer: boolean): Column<BetEvent>[] {
  const cols: Column<BetEvent>[] = [
    {
      key: "time",
      header: "Time",
      cell: (e) => (
        <span className="text-foreground-muted">
          {formatRelativeTime(e.timestamp)}
        </span>
      ),
    },
  ];

  if (showPlayer) {
    cols.push({
      key: "player",
      header: "Player",
      cell: (e) => <AddressChip address={e.player} showCopy={false} />,
    });
  }

  cols.push(
    {
      key: "chance",
      header: "Chance",
      align: "right",
      cell: (e) => (
        <span className="font-mono text-foreground tabular-nums">
          {formatPercentBps(e.rollUnder)}
        </span>
      ),
    },
    {
      key: "roll",
      header: "Roll",
      align: "right",
      cell: (e) => {
        if (!e.settled)
          return (
            <span className="font-mono text-warning">…</span>
          );
        return (
          <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
            {String(e.result).padStart(4, "0")}
            {e.won ? (
              <Check className="w-3.5 h-3.5 text-primary" />
            ) : (
              <X className="w-3.5 h-3.5 text-danger-bright" />
            )}
          </span>
        );
      },
    },
    {
      key: "stake",
      header: "Stake",
      align: "right",
      cell: (e) => (
        <span className="font-mono text-foreground tabular-nums">
          {formatEth(e.stake)}
        </span>
      ),
    },
    {
      key: "payout",
      header: "Payout",
      align: "right",
      cell: (e) =>
        e.settled ? (
          e.won ? (
            <span className="font-mono text-primary tabular-nums">
              +{formatEth((e.payout ?? 0n) - e.stake)}
            </span>
          ) : (
            <span className="font-mono text-foreground-subtle">—</span>
          )
        ) : (
          <span className="font-mono text-foreground-subtle">…</span>
        ),
    },
    {
      key: "verify",
      header: "Verify",
      align: "right",
      cell: (e) => (
        <Link
          href={`/proof/${e.requestId.toString()}`}
          className="inline-flex items-center gap-1 text-foreground-muted hover:text-primary transition-colors"
          aria-label="Verify on-chain"
        >
          <ExternalLink className="w-4 h-4" />
        </Link>
      ),
    },
  );

  return cols;
}
