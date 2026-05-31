"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { TopBar } from "@/components/layout/TopBar";
import { BetForm } from "@/components/dice/BetForm";
import { BetButton } from "@/components/dice/BetButton";
import { DiceCanvas } from "@/components/dice/DiceCanvas";
import { LiveFeed } from "@/components/feed/LiveFeed";
import { MyBets } from "@/components/feed/MyBets";
import { Tabs } from "@/components/ui/Tabs";
import { useDicePhase } from "@/hooks/useDicePhase";
import { useCasinoBalance } from "@/hooks/useBalance";
import { useHouseBankroll } from "@/hooks/useHouseBankroll";
import {
  calcMultiplierBps,
  MAX_BET_BPS_OF_BANKROLL,
} from "@/lib/multiplier";

export default function DicePage() {
  const { isConnected } = useAccount();
  const { data: balance } = useCasinoBalance();
  const { data: bankroll } = useHouseBankroll();
  const { phase, placeBet } = useDicePhase();
  const [vrfWarning, setVrfWarning] = useState(false);

  useEffect(() => {
    if (phase.kind !== "awaiting-vrf") {
      setVrfWarning(false);
      return;
    }
    const id = setTimeout(() => setVrfWarning(true), 120_000);
    return () => clearTimeout(id);
  }, [phase]);

  const [rollUnder, setRollUnder] = useState(4950);
  const [stake, setStake] = useState("0.0010");

  async function onRoll() {
    try {
      await placeBet(stake, rollUnder);
    } catch (e) {
      console.error(e);
    }
  }

  // max bet so that maxBankrollRisk <= 1% bankroll.
  // risk = stake * (mult - 10000) / 10000  →  maxStake = (1% bankroll * 10000) / (mult - 10000)
  let maxBetWei: bigint | undefined;
  if (bankroll && (bankroll as bigint) > 0n) {
    const mult = calcMultiplierBps(rollUnder);
    const cap =
      ((bankroll as bigint) * BigInt(MAX_BET_BPS_OF_BANKROLL)) / 10000n;
    if (mult > 10000) {
      maxBetWei = (cap * 10000n) / BigInt(mult - 10000);
    }
  }

  const disabled = !isConnected || !balance || (balance as bigint) === 0n;

  return (
    <>
      <TopBar />
      <main className="max-w-[1280px] mx-auto px-6 md:px-10 py-10 md:py-12 space-y-7">
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-7 items-stretch">
          <DiceCanvas phase={phase} rollUnder={rollUnder} />
          <div className="flex flex-col gap-6">
            <BetForm
              rollUnder={rollUnder}
              setRollUnder={setRollUnder}
              stakeEth={stake}
              setStakeEth={setStake}
              balanceWei={balance as bigint | undefined}
              maxBetWei={maxBetWei}
              disabled={disabled}
            />
            <BetButton phase={phase} disabled={disabled} onClick={onRoll} />
          </div>
        </div>

        <section className="mt-8 bg-surface border border-border rounded-lg overflow-hidden">
          <Tabs
            tabs={[
              { key: "mine", label: "My Bets", content: <MyBets /> },
              { key: "live", label: "Live Feed", content: <LiveFeed /> },
            ]}
            initialKey="mine"
          />
        </section>
      </main>

      {vrfWarning && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 max-w-sm bg-surface-elevated border border-warning/40 rounded-lg p-4 shadow-[var(--shadow-card)] text-sm"
        >
          <div className="font-mono text-warning uppercase tracking-wider text-xs mb-2">
            VRF taking longer than usual
          </div>
          <p className="text-foreground-muted leading-[1.55]">
            Your stake is safe. If this persists, check Etherscan or wait 24h
            to use{" "}
            <code className="font-mono text-foreground">rescueStaleBet</code>.
          </p>
        </div>
      )}
    </>
  );
}
