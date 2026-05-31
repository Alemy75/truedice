"use client";

import { useAccount } from "wagmi";
import { DataTable } from "@/components/ui/DataTable";
import { feedColumns } from "./FeedRow";
import { useMyBets } from "@/hooks/useMyBets";

export function MyBets() {
  const { isConnected } = useAccount();
  const events = useMyBets();

  if (!isConnected) {
    return (
      <div className="py-14 text-center font-sans text-foreground-muted">
        <div className="text-2xl opacity-40 mb-2">◇</div>
        Connect a wallet to see your bets.
      </div>
    );
  }
  return (
    <DataTable
      columns={feedColumns(false)}
      rows={events}
      rowKey={(e) => e.requestId.toString()}
      emptyState={
        <div className="font-sans text-foreground-muted">
          <div className="text-2xl opacity-40 mb-2">◇</div>
          Your bets will appear here.{" "}
          <span className="font-mono">The chain</span> remembers everything.
        </div>
      }
    />
  );
}
