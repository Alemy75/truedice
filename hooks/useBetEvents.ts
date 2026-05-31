"use client";

import { useMemo } from "react";
import { useReadContract, useWatchContractEvent } from "wagmi";
import { useCasinoContract } from "./useCasinoContract";

export interface BetEvent {
  requestId: bigint;
  player: `0x${string}`;
  stake: bigint;
  rollUnder: number;
  multiplierBps: number;
  result?: number;
  won?: boolean;
  payout?: bigint;
  settled: boolean;
  timestamp: number;
}

const MAX_FEED = 50;

interface RawRoll {
  player: `0x${string}`;
  stake: bigint;
  rollUnder: bigint;
  multiplierBps: bigint;
  result: bigint;
  won: boolean;
  settled: boolean;
  requestedAt: bigint;
}

/**
 * Reads recent settled bets directly from the contract via getRecentRolls(50)
 * + recentRollIds() — avoids eth_getLogs entirely. Alchemy free tier limits
 * eth_getLogs to 10 blocks; this approach uses eth_call which has no such
 * limit (each call is O(1) storage reads).
 *
 * Live updates: when a BetPlaced / BetSettled event arrives, refetch.
 * useWatchContractEvent polls only the latest block — stays well under
 * the 10-block limit per poll.
 */
export function useBetEvents() {
  const contract = useCasinoContract();

  const { data: rollsData, refetch: refetchRolls } = useReadContract({
    ...contract,
    functionName: "getRecentRolls",
    args: [BigInt(MAX_FEED)],
  });

  // Paired ids — same chronological ordering as getRecentRolls. Single
  // RPC call (replaces the prior 50-element multicall on recentRollIds).
  const { data: idsData, refetch: refetchIds } = useReadContract({
    ...contract,
    functionName: "getRecentRollIds",
    args: [BigInt(MAX_FEED)],
  });

  const events = useMemo<BetEvent[]>(() => {
    if (!rollsData || !Array.isArray(rollsData)) return [];
    const rolls = rollsData as RawRoll[];
    const ids = (idsData as readonly bigint[] | undefined) ?? [];

    // rolls.length and ids.length should match (both = K = recentRollIds.length).
    // Pair them by index. If they mismatch (shouldn't happen), fall back to
    // truncating to the shorter list.
    const n = Math.min(rolls.length, ids.length);
    const out: BetEvent[] = [];
    for (let i = 0; i < n; i++) {
      const roll = rolls[i];
      const requestId = ids[i];
      const stake = roll.stake;
      const multiplierBps = Number(roll.multiplierBps);
      const payout =
        roll.won && roll.settled
          ? (stake * BigInt(multiplierBps)) / 10000n
          : undefined;
      out.push({
        requestId,
        player: roll.player,
        stake,
        rollUnder: Number(roll.rollUnder),
        multiplierBps,
        result: roll.settled ? Number(roll.result) : undefined,
        won: roll.settled ? roll.won : undefined,
        payout,
        settled: roll.settled,
        timestamp: Number(roll.requestedAt),
      });
    }
    // Newest first
    out.sort((a, b) => b.timestamp - a.timestamp);
    return out;
  }, [rollsData, idsData]);

  // Live: refetch on any new BetPlaced/BetSettled.
  useWatchContractEvent({
    ...contract,
    eventName: "BetPlaced",
    onLogs() {
      void refetchRolls();
      void refetchIds();
    },
  });
  useWatchContractEvent({
    ...contract,
    eventName: "BetSettled",
    onLogs() {
      void refetchRolls();
      void refetchIds();
    },
  });

  return events;
}
