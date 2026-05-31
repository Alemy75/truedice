import { useReadContract, useWatchContractEvent } from "wagmi";
import { useCasinoContract } from "./useCasinoContract";

export function useHouseBankroll() {
  const contract = useCasinoContract();
  const query = useReadContract({
    ...contract,
    functionName: "houseBankroll",
  });
  useWatchContractEvent({
    ...contract,
    eventName: "HouseBankrollChanged",
    onLogs: () => query.refetch(),
  });
  return query;
}
