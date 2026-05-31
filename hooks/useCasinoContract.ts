import { useMemo } from "react";
import { type Address, getAddress } from "viem";
import { CasinoDiceAbi } from "@/lib/abi/CasinoDice";

const ADDRESS = process.env.NEXT_PUBLIC_CASINO_CONTRACT as
  | `0x${string}`
  | undefined;

export function useCasinoContract() {
  return useMemo(() => {
    if (!ADDRESS) {
      throw new Error("NEXT_PUBLIC_CASINO_CONTRACT not set");
    }
    return {
      address: getAddress(ADDRESS) as Address,
      abi: CasinoDiceAbi,
    } as const;
  }, []);
}
