"use client";

import { ConnectButton as RKConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/Button";
import { AddressChip } from "@/components/ui/AddressChip";

export function ConnectButton() {
  return (
    <RKConnectButton.Custom>
      {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
        if (!mounted) return null;
        if (!account || !chain) {
          return (
            <Button
              onClick={openConnectModal}
              variant="primary"
              size="md"
              goldRim
            >
              Connect Wallet
            </Button>
          );
        }
        return (
          <button
            type="button"
            onClick={openAccountModal}
            className="inline-flex items-center gap-2 h-10 px-3 rounded-md bg-surface-overlay border border-border hover:border-primary/40 transition-colors"
          >
            <AddressChip address={account.address} showCopy={false} />
          </button>
        );
      }}
    </RKConnectButton.Custom>
  );
}
