import { useEffect, useState } from "react";
import { useAccount, usePublicClient, useWatchContractEvent } from "wagmi";
import { useCasinoContract } from "./useCasinoContract";
import { type BetEvent } from "./useBetEvents";

const DEPLOY_BLOCK_FALLBACK = 10960000n;
const DEPLOY_BLOCK = process.env.NEXT_PUBLIC_DEPLOY_BLOCK
  ? BigInt(process.env.NEXT_PUBLIC_DEPLOY_BLOCK)
  : DEPLOY_BLOCK_FALLBACK;

export function useMyBets() {
  const { address } = useAccount();
  const contract = useCasinoContract();
  const publicClient = usePublicClient();
  const [events, setEvents] = useState<BetEvent[]>([]);

  useEffect(() => {
    if (!address || !publicClient) {
      setEvents([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const placed = await publicClient.getContractEvents({
          ...contract,
          eventName: "BetPlaced",
          args: { player: address },
          fromBlock: DEPLOY_BLOCK,
          toBlock: "latest",
        });
        const settled = await publicClient.getContractEvents({
          ...contract,
          eventName: "BetSettled",
          args: { player: address },
          fromBlock: DEPLOY_BLOCK,
          toBlock: "latest",
        });
        const settledByReq = new Map(
          settled.map((l) => [l.args.requestId as bigint, l]),
        );
        const merged: BetEvent[] = placed.map((l) => {
          const requestId = l.args.requestId as bigint;
          const s = settledByReq.get(requestId);
          return {
            requestId,
            player: l.args.player as `0x${string}`,
            stake: l.args.stake as bigint,
            rollUnder: Number(l.args.rollUnder as bigint),
            multiplierBps: Number(l.args.multiplierBps as bigint),
            result: s ? Number(s.args.result as bigint) : undefined,
            won: s ? (s.args.won as boolean) : undefined,
            payout: s ? (s.args.payout as bigint) : undefined,
            settled: !!s,
            txHash: l.transactionHash,
            blockNumber: l.blockNumber!,
            timestamp: Date.now() / 1000,
          };
        });
        merged.sort((a, b) => Number(b.blockNumber - a.blockNumber));
        if (!cancelled) setEvents(merged);
      } catch (e) {
        console.error("useMyBets initial load failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, publicClient, contract]);

  useWatchContractEvent({
    ...contract,
    eventName: "BetPlaced",
    args: address ? { player: address } : undefined,
    onLogs(logs) {
      setEvents((prev) => {
        const seen = new Set(prev.map((e) => e.requestId));
        const additions: BetEvent[] = logs
          .map((l) => ({
            requestId: l.args.requestId as bigint,
            player: l.args.player as `0x${string}`,
            stake: l.args.stake as bigint,
            rollUnder: Number(l.args.rollUnder as bigint),
            multiplierBps: Number(l.args.multiplierBps as bigint),
            settled: false,
            txHash: l.transactionHash,
            blockNumber: l.blockNumber!,
            timestamp: Date.now() / 1000,
          }))
          .filter((a) => !seen.has(a.requestId));
        return [...additions, ...prev];
      });
    },
  });

  useWatchContractEvent({
    ...contract,
    eventName: "BetSettled",
    args: address ? { player: address } : undefined,
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

  return events;
}
