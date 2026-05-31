import { useAccount, useReadContract, useWatchContractEvent } from "wagmi";
import { useCasinoContract } from "./useCasinoContract";

export function useCasinoBalance() {
  const { address } = useAccount();
  const contract = useCasinoContract();

  const query = useReadContract({
    ...contract,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // refetch on Deposited/Withdrawn/BetPlaced/BetSettled events for this player
  useWatchContractEvent({
    ...contract,
    eventName: "Deposited",
    args: address ? { player: address } : undefined,
    onLogs: () => query.refetch(),
  });
  useWatchContractEvent({
    ...contract,
    eventName: "Withdrawn",
    args: address ? { player: address } : undefined,
    onLogs: () => query.refetch(),
  });
  useWatchContractEvent({
    ...contract,
    eventName: "BetPlaced",
    args: address ? { player: address } : undefined,
    onLogs: () => query.refetch(),
  });
  useWatchContractEvent({
    ...contract,
    eventName: "BetSettled",
    args: address ? { player: address } : undefined,
    onLogs: () => query.refetch(),
  });

  return query;
}
