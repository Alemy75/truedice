"use client";

import { useAccount, useChainId } from "wagmi";
import { sepolia } from "wagmi/chains";
import { cn } from "@/lib/cn";

export function NetworkBadge() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  if (!isConnected) return null;

  const onSepolia = chainId === sepolia.id;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 px-3 h-8 rounded-full border text-xs font-mono uppercase tracking-wider",
        onSepolia
          ? "border-warning/40 text-warning"
          : "border-danger text-danger",
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          onSepolia ? "bg-warning" : "bg-danger",
        )}
      />
      {onSepolia ? "Sepolia" : "Wrong Network"}
    </span>
  );
}
