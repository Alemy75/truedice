"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

/**
 * Smart "Enter Casino" CTA used on the lobby hero.
 *
 * - Connected wallet → navigates straight to /dice.
 * - Disconnected → opens the RainbowKit connect modal, then auto-navigates
 *   to /dice once the user successfully connects. We track click intent
 *   with a ref so unrelated connection events (e.g. user connecting from
 *   the nav while still on /) don't trigger a navigation.
 */
export function EnterCasinoButton({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const { isConnected } = useAccount();
  const router = useRouter();
  const wantsToEnter = useRef(false);

  useEffect(() => {
    if (wantsToEnter.current && isConnected) {
      wantsToEnter.current = false;
      router.push("/dice");
    }
  }, [isConnected, router]);

  return (
    <ConnectButton.Custom>
      {({ openConnectModal, mounted }) => (
        <button
          type="button"
          className={className}
          disabled={!mounted}
          onClick={() => {
            if (isConnected) {
              router.push("/dice");
            } else {
              wantsToEnter.current = true;
              openConnectModal();
            }
          }}
        >
          {children}
        </button>
      )}
    </ConnectButton.Custom>
  );
}
