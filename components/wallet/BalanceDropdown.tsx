"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useAccount } from "wagmi";
import { useCasinoBalance } from "@/hooks/useBalance";
import { formatEthSmart } from "@/lib/format";
import { DepositModal } from "@/components/modals/DepositModal";
import { WithdrawModal } from "@/components/modals/WithdrawModal";
import { cn } from "@/lib/cn";

/**
 * "In Casino" balance pill in the nav. Click to open a dropdown with
 * Deposit / Withdraw shortcuts. Matches BrandedConnectButton's
 * .menu-trigger pill style so the right-side cluster reads as one
 * coherent unit.
 *
 * Responsive: on screens ≤ 640px the "IN CASINO" eyebrow label hides
 * so the pill collapses to "<balance> ETH ⌄" — saves ~64px of width
 * for the cluster + burger to fit alongside the logo.
 */
export function BalanceDropdown() {
  const { isConnected } = useAccount();
  const { data: balance } = useCasinoBalance();
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<"deposit" | "withdraw" | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  if (!isConnected) return null;

  return (
    <>
      <div className="menu-wrap" ref={wrapRef}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className="menu-trigger"
          title="Funds you've deposited into the casino contract. Separate from your wallet's on-chain ETH."
        >
          <span className="menu-trigger-label">In Casino</span>
          <span className="mono">
            {balance !== undefined ? formatEthSmart(balance as bigint, 6) : "—"}{" "}
            <span className="menu-trigger-suffix">ETH</span>
          </span>
          <ChevronDown
            className={cn("caret", open && "open")}
            size={12}
          />
        </button>
        {open && (
          <div className="menu menu-dropdown">
            <button
              type="button"
              onClick={() => {
                setModal("deposit");
                setOpen(false);
              }}
            >
              Deposit
            </button>
            <button
              type="button"
              onClick={() => {
                setModal("withdraw");
                setOpen(false);
              }}
            >
              Withdraw
            </button>
          </div>
        )}
      </div>
      <DepositModal open={modal === "deposit"} onClose={() => setModal(null)} />
      <WithdrawModal open={modal === "withdraw"} onClose={() => setModal(null)} />
    </>
  );
}
