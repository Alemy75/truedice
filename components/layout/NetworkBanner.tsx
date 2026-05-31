"use client";

import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";

/**
 * Wrong-network banner. Shown only when the wallet is connected to a
 * chain other than Sepolia. Uses the .net-banner global class.
 */
export function NetworkBanner() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected || chainId === sepolia.id) return null;

  return (
    <div role="alert" className="net-banner show">
      <span>
        This app runs on Sepolia. You&rsquo;re on chain{" "}
        <span className="mono">{chainId}</span>.
      </span>
      <button
        type="button"
        className="btn btn-danger btn-sm"
        onClick={() => switchChain({ chainId: sepolia.id })}
        disabled={isPending}
      >
        {isPending ? "Switching…" : "Switch to Sepolia"}
      </button>
    </div>
  );
}
