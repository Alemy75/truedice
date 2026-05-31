"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ChevronDown, AlertTriangle } from "lucide-react";

/**
 * Brand-styled wrapper around RainbowKit's ConnectButton.
 *
 * Replaces the default RK pill with markup that uses our own .btn* /
 * .menu-trigger CSS so the wallet button matches Nav typography and
 * the gold-on-warm-black palette. The MODAL (chain switcher, wallet
 * picker, account drawer) still uses RainbowKit's built-in theming —
 * intentionally not overridden.
 */
export function BrandedConnectButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready =
          mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
          >
            {!connected ? (
              <button
                type="button"
                onClick={openConnectModal}
                className="btn btn-primary btn-md"
              >
                Connect Wallet
              </button>
            ) : chain.unsupported ? (
              <button
                type="button"
                onClick={openChainModal}
                className="btn btn-danger btn-md"
              >
                <AlertTriangle size={14} />
                Wrong network
              </button>
            ) : (
              <button
                type="button"
                onClick={openAccountModal}
                className="menu-trigger"
                aria-label={`Account ${account.displayName}`}
              >
                <span className="mono">{account.displayName}</span>
                <ChevronDown className="caret" size={12} />
              </button>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
