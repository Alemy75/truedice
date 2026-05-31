"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useAccount } from "wagmi";
import { useCasinoBalance } from "@/hooks/useBalance";
import { formatEth } from "@/lib/format";
import { DepositModal } from "@/components/modals/DepositModal";
import { WithdrawModal } from "@/components/modals/WithdrawModal";
import { cn } from "@/lib/cn";

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
      <div className="relative" ref={wrapRef}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className="inline-flex items-center gap-2 h-10 px-3.5 rounded-md bg-surface-overlay border border-border hover:border-primary/40 transition-colors"
        >
          <span className="text-foreground-muted text-sm">Balance ·</span>
          <span className="font-mono text-foreground text-sm tabular-nums">
            {balance !== undefined ? formatEth(balance as bigint) : "—"} ETH
          </span>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 text-foreground-muted opacity-60 transition-transform duration-150",
              open && "rotate-180",
            )}
          />
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-2 min-w-[180px] bg-surface-elevated border border-border rounded-md shadow-[var(--shadow-card)] overflow-hidden p-1.5 z-50">
            <button
              className="w-full text-left px-3 py-2.5 rounded-sm text-sm text-foreground hover:bg-surface-overlay hover:text-primary transition-colors"
              onClick={() => {
                setModal("deposit");
                setOpen(false);
              }}
            >
              Deposit
            </button>
            <button
              className="w-full text-left px-3 py-2.5 rounded-sm text-sm text-foreground hover:bg-surface-overlay hover:text-primary transition-colors"
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
      <DepositModal
        open={modal === "deposit"}
        onClose={() => setModal(null)}
      />
      <WithdrawModal
        open={modal === "withdraw"}
        onClose={() => setModal(null)}
      />
    </>
  );
}
