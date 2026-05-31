import { useCallback, useState } from "react";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWatchContractEvent,
  useWriteContract,
} from "wagmi";
import { parseEther } from "viem";
import { useCasinoContract } from "./useCasinoContract";
import { calcMultiplierBps } from "@/lib/multiplier";

export type DicePhase =
  | { kind: "idle" }
  | { kind: "confirm" }
  | { kind: "broadcasting"; txHash: `0x${string}` }
  | { kind: "awaiting-vrf"; txHash: `0x${string}`; requestId?: bigint }
  | { kind: "won"; payout: bigint; result: number; requestId: bigint }
  | { kind: "lost"; result: number; requestId: bigint };

export function useDicePhase() {
  const { address } = useAccount();
  const contract = useCasinoContract();
  const [phase, setPhase] = useState<DicePhase>({ kind: "idle" });
  const { writeContractAsync, reset } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  });

  // listen for BetPlaced to capture requestId after tx mined
  useWatchContractEvent({
    ...contract,
    eventName: "BetPlaced",
    args: address ? { player: address } : undefined,
    onLogs(logs) {
      setPhase((current) => {
        if (
          current.kind !== "broadcasting" &&
          current.kind !== "awaiting-vrf"
        ) {
          return current;
        }
        const log = logs[logs.length - 1];
        const requestId = log.args.requestId as bigint;
        const lastTxHash =
          current.kind === "broadcasting" ? current.txHash : current.txHash;
        return { kind: "awaiting-vrf", txHash: lastTxHash, requestId };
      });
    },
  });

  useWatchContractEvent({
    ...contract,
    eventName: "BetSettled",
    args: address ? { player: address } : undefined,
    onLogs(logs) {
      setPhase((current) => {
        if (current.kind !== "awaiting-vrf") return current;
        const log = logs[logs.length - 1];
        const won = log.args.won as boolean;
        const result = Number(log.args.result as bigint);
        const requestId = log.args.requestId as bigint;
        const payout = log.args.payout as bigint;
        if (current.requestId && requestId !== current.requestId) {
          return current;
        }
        // auto-reset to idle after 4s so player sees the result
        setTimeout(() => {
          setPhase({ kind: "idle" });
          reset();
          setTxHash(undefined);
        }, 4000);
        return won
          ? { kind: "won", payout, result, requestId }
          : { kind: "lost", result, requestId };
      });
    },
  });

  const placeBet = useCallback(
    async (stakeEth: string, rollUnder: number) => {
      if (!address) throw new Error("not connected");
      const stake = parseEther(stakeEth as `${number}`);
      calcMultiplierBps(rollUnder); // throws if out of range
      setPhase({ kind: "confirm" });
      try {
        const hash = await writeContractAsync({
          ...contract,
          functionName: "placeBet",
          args: [stake, BigInt(rollUnder)],
        });
        setTxHash(hash);
        setPhase({ kind: "broadcasting", txHash: hash });
      } catch (err) {
        // user rejected or onchain revert
        setPhase({ kind: "idle" });
        throw err;
      }
    },
    [address, contract, writeContractAsync],
  );

  return { phase, placeBet };
}
