"use client";

import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { Button } from "@/components/ui/Button";

export function NetworkBanner() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected || chainId === sepolia.id) return null;

  return (
    <div
      role="alert"
      className="bg-danger/10 border-b border-danger/40 text-danger-bright px-6 py-3 flex flex-wrap items-center justify-center gap-4 text-sm"
    >
      <span>
        This app runs on Sepolia. You&rsquo;re on chain{" "}
        <span className="font-mono">{chainId}</span>.
      </span>
      <Button
        variant="danger"
        size="sm"
        onClick={() => switchChain({ chainId: sepolia.id })}
        disabled={isPending}
      >
        {isPending ? "Switching…" : "Switch to Sepolia"}
      </Button>
    </div>
  );
}
