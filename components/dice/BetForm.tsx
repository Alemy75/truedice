"use client";

import { parseEther } from "viem";
import { Input } from "@/components/ui/Input";
import { Slider } from "@/components/ui/Slider";
import { Button } from "@/components/ui/Button";
import {
  calcMultiplierBps,
  calcProfitOnWin,
  MIN_ROLL_UNDER,
  MAX_ROLL_UNDER,
} from "@/lib/multiplier";
import {
  formatPercentBps,
  formatMultiplierBps,
  formatEth,
} from "@/lib/format";

interface BetFormProps {
  rollUnder: number;
  setRollUnder: (v: number) => void;
  stakeEth: string;
  setStakeEth: (v: string) => void;
  balanceWei: bigint | undefined;
  maxBetWei: bigint | undefined;
  disabled: boolean;
}

export function BetForm({
  rollUnder,
  setRollUnder,
  stakeEth,
  setStakeEth,
  balanceWei,
  maxBetWei,
  disabled,
}: BetFormProps) {
  const mult = calcMultiplierBps(rollUnder);
  let stakeWei = 0n;
  try {
    stakeWei = stakeEth ? parseEther(stakeEth as `${number}`) : 0n;
  } catch {
    stakeWei = 0n;
  }
  const profit = stakeWei > 0n ? calcProfitOnWin(stakeWei, mult) : 0n;
  const overBankroll =
    stakeWei > 0n && maxBetWei !== undefined && stakeWei > maxBetWei;
  const overBalance =
    stakeWei > 0n && balanceWei !== undefined && stakeWei > balanceWei;

  function half() {
    if (!stakeWei) return;
    setStakeEth(formatEth(stakeWei / 2n, 6));
  }
  function double() {
    if (!stakeWei) return;
    setStakeEth(formatEth(stakeWei * 2n, 6));
  }
  function setMax() {
    let cap: bigint | undefined =
      balanceWei !== undefined ? balanceWei : undefined;
    if (maxBetWei !== undefined) {
      cap = cap !== undefined && cap < maxBetWei ? cap : maxBetWei;
    }
    if (cap !== undefined) setStakeEth(formatEth(cap, 6));
  }

  return (
    <div className="relative bg-surface border border-border rounded-lg p-8 flex flex-col">
      {/* Win chance + slider + computed rows */}
      <section className="form-section">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Win Chance</span>
          <span className="font-mono text-lg text-foreground tabular-nums">
            {formatPercentBps(rollUnder)}
          </span>
        </div>
        <div className="my-5 px-0.5">
          <Slider
            value={rollUnder}
            min={MIN_ROLL_UNDER}
            max={MAX_ROLL_UNDER}
            step={1}
            onChange={setRollUnder}
          />
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Multiplier</span>
            <span className="font-mono text-lg text-primary tabular-nums">
              {formatMultiplierBps(mult)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="eyebrow">Roll Under</span>
            <span className="font-mono text-lg text-foreground-muted tabular-nums">
              {rollUnder}
            </span>
          </div>
        </div>
      </section>

      {/* Bet amount */}
      <section className="mt-6 pt-6 border-t border-border-subtle">
        <div className="flex items-center justify-between mb-3">
          <span className="eyebrow">Bet Amount</span>
          <span className="text-xs text-foreground-subtle">
            Balance ·{" "}
            <span className="font-mono text-foreground-muted">
              {balanceWei !== undefined ? formatEth(balanceWei) : "—"} ETH
            </span>
          </span>
        </div>
        <Input
          value={stakeEth}
          onChange={(e) => setStakeEth(e.target.value)}
          placeholder="0.0010"
          suffix="ETH"
          inputMode="decimal"
          error={overBalance || overBankroll}
        />
        <div className="flex items-center gap-2 mt-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={half}
            disabled={!stakeWei || disabled}
            className="flex-1 font-mono"
          >
            ½
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={double}
            disabled={!stakeWei || disabled}
            className="flex-1 font-mono"
          >
            2×
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={setMax}
            disabled={
              disabled ||
              (balanceWei === undefined && maxBetWei === undefined)
            }
            className="flex-1 font-mono"
          >
            Max
          </Button>
        </div>
      </section>

      {/* Profit on win */}
      <section className="mt-6 pt-6 border-t border-border-subtle">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Profit on Win</span>
          <span
            className={`font-mono text-lg tabular-nums ${
              profit > 0n ? "text-primary" : "text-foreground-subtle"
            }`}
          >
            {profit > 0n ? `+${formatEth(profit)} ETH` : "—"}
          </span>
        </div>
      </section>

      {overBankroll && !overBalance && (
        <p className="mt-3 text-xs text-danger-bright font-mono">
          Bet exceeds 1% of casino bankroll. Reduce bet or wait for next roll.
        </p>
      )}
      {overBalance && (
        <p className="mt-3 text-xs text-danger-bright font-mono">
          Insufficient balance. Deposit more to bet this much.
        </p>
      )}
    </div>
  );
}
