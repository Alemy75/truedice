"use client";

import { DataTable } from "@/components/ui/DataTable";
import { useBetEvents } from "@/hooks/useBetEvents";
import { feedColumns } from "./FeedRow";

export function LiveFeed() {
  const events = useBetEvents();
  return (
    <DataTable
      columns={feedColumns(true)}
      rows={events}
      rowKey={(e) => e.requestId.toString()}
      emptyState={
        <div className="font-sans text-foreground-muted">
          <div className="text-2xl opacity-40 mb-2">◇</div>
          No bets yet. Be the first to roll.
        </div>
      }
    />
  );
}
