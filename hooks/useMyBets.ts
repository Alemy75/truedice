"use client";

import { useMemo } from "react";
import { useAccount } from "wagmi";
import { useBetEvents, type BetEvent } from "./useBetEvents";

/**
 * Returns the connected player's bets, filtered from useBetEvents.
 *
 * Note: this only shows bets that are in the contract's recentRollIds
 * ring buffer (last 50 settled+pending across ALL players). If the user
 * has older bets that fell out of the buffer, they won't appear here.
 * For most users this is fine; a full history would require either:
 *   - subgraph indexer
 *   - upgrading Alchemy plan (≥ Growth tier removes the 10-block getLogs limit)
 *   - extending the contract to store per-player roll lists
 */
export function useMyBets(): BetEvent[] {
  const { address } = useAccount();
  const allBets = useBetEvents();

  return useMemo(() => {
    if (!address) return [];
    const lc = address.toLowerCase();
    return allBets.filter((e) => e.player.toLowerCase() === lc);
  }, [allBets, address]);
}
