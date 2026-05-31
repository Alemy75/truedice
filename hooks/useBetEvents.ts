import { useEffect, useState } from "react";
import { useWatchContractEvent, usePublicClient } from "wagmi";
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
  txHash: `0x${string}`;
  blockNumber: bigint;
  timestamp: number;
}

const MAX_FEED = 50;

export function useBetEvents() {
  const contract = useCasinoContract();
  const publicClient = usePublicClient();
  const [events, setEvents] = useState<BetEvent[]>([]);

  // initial load via getContractEvents
  useEffect(() => {
    if (!publicClient) return;
    let cancelled = false;
    (async () => {
      try {
        const placedLogs = await publicClient.getContractEvents({
          ...contract,
          eventName: "BetPlaced",
          fromBlock: "earliest",
          toBlock: "latest",
        });
        const settledLogs = await publicClient.getContractEvents({
          ...contract,
          eventName: "BetSettled",
          fromBlock: "earliest",
          toBlock: "latest",
        });

        const settledByReq = new Map<
          bigint,
          (typeof settledLogs)[number]
        >();
        for (const l of settledLogs) {
          settledByReq.set(l.args.requestId as bigint, l);
        }

        const blockTimestamps = new Map<bigint, number>();
        const uniqueBlocks = [
          ...new Set(placedLogs.map((l) => l.blockNumber).filter(Boolean)),
        ] as bigint[];
        await Promise.all(
          uniqueBlocks.map(async (bn) => {
            const block = await publicClient.getBlock({ blockNumber: bn });
            blockTimestamps.set(bn, Number(block.timestamp));
          }),
        );

        const merged: BetEvent[] = placedLogs.map((l) => {
          const requestId = l.args.requestId as bigint;
          const settled = settledByReq.get(requestId);
          return {
            requestId,
            player: l.args.player as `0x${string}`,
            stake: l.args.stake as bigint,
            rollUnder: Number(l.args.rollUnder as bigint),
            multiplierBps: Number(l.args.multiplierBps as bigint),
            result: settled ? Number(settled.args.result as bigint) : undefined,
            won: settled ? (settled.args.won as boolean) : undefined,
            payout: settled ? (settled.args.payout as bigint) : undefined,
            settled: !!settled,
            txHash: l.transactionHash,
            blockNumber: l.blockNumber!,
            timestamp:
              blockTimestamps.get(l.blockNumber!) ?? Date.now() / 1000,
          };
        });
        merged.sort((a, b) => Number(b.blockNumber - a.blockNumber));
        if (!cancelled) setEvents(merged.slice(0, MAX_FEED));
      } catch (e) {
        console.error("useBetEvents initial load failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publicClient, contract]);

  // live subscribe to new events
  useWatchContractEvent({
    ...contract,
    eventName: "BetSettled",
    onLogs(logs) {
      setEvents((prev) => {
        const next = [...prev];
        for (const l of logs) {
          const requestId = l.args.requestId as bigint;
          const idx = next.findIndex((e) => e.requestId === requestId);
          if (idx >= 0) {
            next[idx] = {
              ...next[idx],
              result: Number(l.args.result as bigint),
              won: l.args.won as boolean,
              payout: l.args.payout as bigint,
              settled: true,
            };
          }
        }
        return next;
      });
    },
  });

  useWatchContractEvent({
    ...contract,
    eventName: "BetPlaced",
    onLogs(logs) {
      setEvents((prev) => {
        const additions: BetEvent[] = logs.map((l) => ({
          requestId: l.args.requestId as bigint,
          player: l.args.player as `0x${string}`,
          stake: l.args.stake as bigint,
          rollUnder: Number(l.args.rollUnder as bigint),
          multiplierBps: Number(l.args.multiplierBps as bigint),
          settled: false,
          txHash: l.transactionHash,
          blockNumber: l.blockNumber!,
          timestamp: Date.now() / 1000,
        }));
        // dedupe by requestId in case initial load already has them
        const seen = new Set(prev.map((e) => e.requestId));
        const newOnes = additions.filter((a) => !seen.has(a.requestId));
        return [...newOnes, ...prev].slice(0, MAX_FEED);
      });
    },
  });

  return events;
}
