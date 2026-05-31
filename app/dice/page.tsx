"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { parseEther } from "viem";
import confetti from "canvas-confetti";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { AddressChip } from "@/components/ui/AddressChip";
import { BetSpinner } from "@/components/dice/BetSpinner";
import { useDicePhase } from "@/hooks/useDicePhase";
import { useCasinoBalance } from "@/hooks/useBalance";
import { useHouseBankroll } from "@/hooks/useHouseBankroll";
import { useBetEvents, type BetEvent } from "@/hooks/useBetEvents";
import { useMyBets } from "@/hooks/useMyBets";
import {
  calcMultiplierBps,
  calcProfitOnWin,
  MIN_ROLL_UNDER,
  MAX_ROLL_UNDER,
  MAX_BET_BPS_OF_BANKROLL,
} from "@/lib/multiplier";
import {
  formatEth,
  formatEthSmart,
  formatPercentBps,
  formatMultiplierBps,
  formatRelativeTime,
} from "@/lib/format";

type TabKey = "mine" | "live" | "high";

export default function DicePage() {
  const { isConnected } = useAccount();
  const { data: balance } = useCasinoBalance();
  const { data: bankroll } = useHouseBankroll();
  const { phase, placeBet } = useDicePhase();
  const allBets = useBetEvents();
  const myBets = useMyBets();

  const [rollUnder, setRollUnder] = useState(4950);
  const [stake, setStake] = useState("0.0010");
  const [vrfWarning, setVrfWarning] = useState(false);
  const [tab, setTab] = useState<TabKey>("mine");

  const canvasRef = useRef<HTMLElement>(null);
  const lastShownResult = useRef<number | null>(null);

  // VRF stall toast — appears after 120s in awaiting-vrf
  useEffect(() => {
    if (phase.kind !== "awaiting-vrf") {
      setVrfWarning(false);
      return;
    }
    const id = setTimeout(() => setVrfWarning(true), 120_000);
    return () => clearTimeout(id);
  }, [phase]);

  // Confetti on win
  useEffect(() => {
    if (phase.kind === "won" && lastShownResult.current !== phase.result) {
      lastShownResult.current = phase.result;
      const rect = canvasRef.current?.getBoundingClientRect();
      const origin = rect
        ? {
            x: (rect.left + rect.width / 2) / window.innerWidth,
            y: (rect.top + 100) / window.innerHeight,
          }
        : undefined;
      confetti({
        particleCount: 30,
        spread: 55,
        startVelocity: 28,
        gravity: 1.2,
        scalar: 0.8,
        ticks: 120,
        colors: ["#D4AF37", "#E5C76B", "#C9A961"],
        origin,
      });
    }
    if (phase.kind === "idle") {
      lastShownResult.current = null;
    }
  }, [phase]);

  // Derived bet math
  const mult = calcMultiplierBps(rollUnder);
  let stakeWei = 0n;
  try {
    stakeWei = stake ? parseEther(stake as `${number}`) : 0n;
  } catch {
    stakeWei = 0n;
  }
  const profit = stakeWei > 0n ? calcProfitOnWin(stakeWei, mult) : 0n;

  // max bet so that maxBankrollRisk <= 1% bankroll
  let maxBetWei: bigint | undefined;
  if (bankroll && (bankroll as bigint) > 0n && mult > 10000) {
    const cap =
      ((bankroll as bigint) * BigInt(MAX_BET_BPS_OF_BANKROLL)) / 10000n;
    maxBetWei = (cap * 10000n) / BigInt(mult - 10000);
  }

  const overBalance =
    stakeWei > 0n && balance !== undefined && stakeWei > (balance as bigint);
  const overBankroll =
    stakeWei > 0n && maxBetWei !== undefined && stakeWei > maxBetWei;

  // Roll state derived from phase
  const isInFlight =
    phase.kind === "confirm" ||
    phase.kind === "broadcasting" ||
    phase.kind === "awaiting-vrf";
  const isIdle = phase.kind === "idle";
  const isWon = phase.kind === "won";
  const isLost = phase.kind === "lost";
  const settled = isWon || isLost;
  const result: number | null =
    phase.kind === "won" || phase.kind === "lost" ? phase.result : null;

  let rollLabel = "ROLL DICE";
  if (phase.kind === "confirm") rollLabel = "CONFIRM IN WALLET";
  else if (phase.kind === "broadcasting") rollLabel = "BROADCASTING…";
  else if (phase.kind === "awaiting-vrf") rollLabel = "AWAITING RANDOMNESS";

  // Phase pill
  const pillDot: { className: string; pulse: boolean } = {
    className: "",
    pulse: false,
  };
  let pillStyle: React.CSSProperties | undefined;
  let pillText = "Idle — Ready to roll";
  switch (phase.kind) {
    case "idle":
      pillStyle = { background: "var(--color-foreground-subtle)" };
      pillText = "Idle — Ready to roll";
      break;
    case "confirm":
      pillStyle = { background: "var(--color-foreground-muted)" };
      pillDot.pulse = true;
      pillText = "Confirm in wallet…";
      break;
    case "broadcasting":
      pillStyle = { background: "var(--color-foreground-muted)" };
      pillDot.pulse = true;
      pillText = "Broadcasting transaction…";
      break;
    case "awaiting-vrf":
      pillDot.className = "dot-silver";
      pillDot.pulse = true;
      pillText = "Awaiting VRF · ≈30s";
      break;
    case "won":
      pillDot.className = "dot-gold";
      // Show NET profit (payout - stake), not gross. Use adaptive precision
      // so tiny wins at near-1x multipliers don't display as "+0.0000".
      pillText = `WON +${formatEthSmart(phase.payout - stakeWei)} ETH`;
      break;
    case "lost":
      pillDot.className = "dot-crimson";
      pillText = `LOST -${formatEthSmart(stakeWei)} ETH`;
      break;
  }

  // Result track values
  const winPct = (rollUnder / 9999) * 100;
  const markerPct = result !== null ? (result / 9999) * 100 : null;

  // CTA help text
  let ctaHelp = "";
  if (overBankroll && !overBalance)
    ctaHelp = "Bet exceeds 1% of casino bankroll. Reduce bet or wait for next roll.";
  else if (overBalance) ctaHelp = "Insufficient balance. Deposit more to bet this much.";

  const disabled =
    !isConnected ||
    !balance ||
    (balance as bigint) === 0n ||
    overBalance ||
    overBankroll ||
    stakeWei <= 0n;

  async function onRoll() {
    // On mobile/tablet, the dice canvas is above the bet form (stacked layout).
    // After clicking ROLL DICE from the form (below the fold), auto-scroll so
    // the canvas + phase pill are in view while the wallet signs / VRF runs.
    // Desktop layout is side-by-side — no scroll needed.
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      canvasRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
    try {
      await placeBet(stake, rollUnder);
    } catch (e) {
      console.error(e);
    }
  }

  function half() {
    if (!stakeWei) return;
    setStake(formatEth(stakeWei / 2n, 6));
  }
  function double() {
    if (!stakeWei) return;
    setStake(formatEth(stakeWei * 2n, 6));
  }
  function setMax() {
    let cap: bigint | undefined =
      balance !== undefined ? (balance as bigint) : undefined;
    if (maxBetWei !== undefined) {
      cap = cap !== undefined && cap < maxBetWei ? cap : maxBetWei;
    }
    if (cap !== undefined) setStake(formatEth(cap, 6));
  }

  // Slider gradient paint (chance %)
  const chancePct = ((rollUnder - MIN_ROLL_UNDER) / (MAX_ROLL_UNDER - MIN_ROLL_UNDER)) * 100;
  const sliderStyle: React.CSSProperties = {
    background: `linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary) ${chancePct}%, var(--color-border-subtle) ${chancePct}%, var(--color-border-subtle) 100%)`,
  };

  // Tabs data
  const highRollers = useMemo<BetEvent[]>(() => {
    const cutoff = Date.now() / 1000 - 86400;
    return [...allBets]
      .filter((e) => e.settled && e.won && e.timestamp >= cutoff)
      .sort((a, b) => Number((b.payout ?? 0n) - (a.payout ?? 0n)))
      .slice(0, 20);
  }, [allBets]);

  const tabRows: BetEvent[] =
    tab === "mine" ? myBets : tab === "live" ? allBets : highRollers;

  // canvas tone class
  const canvasToneClass = isWon ? "win" : isLost ? "loss" : "";

  // dice number class
  let diceNumberClass = "dice-number";
  if (isIdle) diceNumberClass += " idle";
  else if (isInFlight) diceNumberClass += " gold-grad shaking";
  else if (isWon) diceNumberClass += " gold-grad win";
  // loss: plain (no gradient)

  // marker class
  let markerClass = "track-marker";
  if (isInFlight) markerClass += " scanning";
  else if (settled) {
    markerClass += " show animate " + (isWon ? "win" : "loss");
  }

  return (
    <>
      <Nav />

      <main className="play">
        <div className="container play-grid">
          {/* LEFT: dice canvas */}
          <section
            ref={canvasRef}
            className={`canvas-card ${canvasToneClass}`}
          >
            <div className="canvas-vignette" />
            {/* Animation layer (bottom). Always running; lifecycle keyed to phase. */}
            <BetSpinner phase={phase} />
            {/* Two edge-pinned palms — same source PNG, each cropped to
                its own side. Mirrors the hero-palm pattern: no scaling
                artifacts at intermediate viewport widths. */}
            <div className="dice-palm dice-palm-left" aria-hidden />
            <div className="dice-palm dice-palm-right" aria-hidden />

            {isIdle && (
              <div className="dice-idle">
                <div className="eyebrow" style={{ color: "var(--color-foreground-subtle)" }}>
                  Awaiting your bet
                </div>
                <div className="dice-idle-main">Set your stake &amp; roll</div>
              </div>
            )}

            <div className={diceNumberClass}>
              {settled && result !== null ? String(result).padStart(4, "0") : ""}
            </div>

            <div
              className="dice-readout"
              style={{ display: settled ? "flex" : "none" }}
            >
              <div className="r1">
                Result · <span>{result !== null ? String(result).padStart(4, "0") : "0000"}</span> / 9999
              </div>
              <div className="r2">
                Win Under · <span>{rollUnder}</span>
              </div>
            </div>

            <div className="result-track show">
              <div className="track-rail">
                <div
                  className="track-win"
                  style={{ width: `${winPct}%` }}
                />
                <div
                  className="track-threshold"
                  data-val={rollUnder}
                  style={{ left: `${winPct}%` }}
                />
                <div
                  className={markerClass}
                  style={markerPct !== null ? { left: `${markerPct}%` } : undefined}
                />
              </div>
              <div className="track-labels">
                <span>0</span>
                <span>9999</span>
              </div>
            </div>

            <div className="phase-pill">
              <span
                className={`dot ${pillDot.className} ${pillDot.pulse ? "dot-pulse" : ""}`.trim()}
                style={pillStyle}
              />
              {pillText}
            </div>
          </section>

          {/* RIGHT: bet form */}
          <section className={`form-card ${!isConnected ? "locked" : ""}`}>
            <div className="form-lock">
              <div className="eyebrow">Wallet required</div>
              <p
                className="text-muted"
                style={{ fontSize: 15, maxWidth: 240 }}
              >
                Connect a wallet to place a bet. Connecting is free.
              </p>
            </div>

            {/* Win Chance */}
            <div className="form-section">
              <div className="row-between">
                <span className="eyebrow">Win Chance</span>
                <span className="val-mono">{formatPercentBps(rollUnder)}</span>
              </div>
              <div className="slider-wrap">
                <input
                  type="range"
                  className="slider"
                  min={MIN_ROLL_UNDER}
                  max={MAX_ROLL_UNDER}
                  step={1}
                  value={rollUnder}
                  onChange={(e) => setRollUnder(Number(e.target.value))}
                  style={sliderStyle}
                  aria-label="Win chance"
                />
              </div>
              <div className="computed-rows">
                <div className="row-between">
                  <span className="eyebrow">Multiplier</span>
                  <span className="val-mono text-gold">
                    {formatMultiplierBps(mult)}
                  </span>
                </div>
                <div className="row-between">
                  <span className="eyebrow">Roll Under</span>
                  <span className="val-mono text-muted">{rollUnder}</span>
                </div>
              </div>
            </div>

            {/* Bet Amount */}
            <div className="form-section">
              <div className="row-between" style={{ marginBottom: 12 }}>
                <span className="eyebrow">Bet Amount</span>
                <span
                  className="eyebrow"
                  style={{ textTransform: "none", letterSpacing: 0 }}
                >
                  Balance ·{" "}
                  <span
                    className="mono"
                    style={{ color: "var(--color-foreground-muted)" }}
                  >
                    {balance !== undefined ? formatEthSmart(balance as bigint) : "—"} ETH
                  </span>
                </span>
              </div>
              <div className="field-wrap">
                <input
                  className="field has-suffix"
                  inputMode="decimal"
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                  aria-label="Bet amount"
                />
                <span className="field-suffix">ETH</span>
              </div>
              <div className="quick-row">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm mono"
                  onClick={half}
                  disabled={!stakeWei || disabled}
                >
                  ½
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm mono"
                  onClick={double}
                  disabled={!stakeWei || disabled}
                >
                  2×
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm mono"
                  onClick={setMax}
                  disabled={
                    !isConnected ||
                    (balance === undefined && maxBetWei === undefined)
                  }
                >
                  Max
                </button>
              </div>
            </div>

            {/* Profit on Win */}
            <div className="form-section push">
              <div className="row-between">
                <span className="eyebrow">Profit on Win</span>
                <span
                  className={`val-mono ${profit > 0n ? "text-gold" : "text-subtle"}`}
                >
                  {profit > 0n ? `+${formatEthSmart(profit)} ETH` : "—"}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary cta-roll"
              onClick={onRoll}
              disabled={disabled || isInFlight}
            >
              {rollLabel}
            </button>
            <div className="cta-help">{ctaHelp}</div>
          </section>
        </div>

        {/* TABS */}
        <div className="container">
          <div className="tabs" id="feed">
            <div className="tab-list">
              <button
                type="button"
                className={`tab ${tab === "mine" ? "active" : ""}`}
                onClick={() => setTab("mine")}
              >
                My Bets
              </button>
              <button
                type="button"
                className={`tab ${tab === "live" ? "active" : ""}`}
                onClick={() => setTab("live")}
              >
                Live Feed
              </button>
              <button
                type="button"
                className={`tab ${tab === "high" ? "active" : ""}`}
                onClick={() => setTab("high")}
              >
                High Rollers · 24h
              </button>
            </div>
            <div>
              <BetsTable
                rows={tabRows}
                showPlayer={tab !== "mine"}
                isConnected={isConnected}
                tab={tab}
              />
            </div>
          </div>
        </div>
      </main>

      <Footer id="feed" />

      {vrfWarning && (
        <div role="status" className="vrf-stall">
          <div className="vrf-stall-title">VRF taking longer than usual</div>
          <p>
            Your stake is safe. If this persists, check Etherscan or wait 24h to use{" "}
            <code>rescueStaleBet</code>.
          </p>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------
   Tab content: bets table
   ------------------------------------------------------------------ */
const TABLE_PAGE_SIZE = 10;

function BetsTable({
  rows,
  showPlayer,
  isConnected,
  tab,
}: {
  rows: BetEvent[];
  showPlayer: boolean;
  isConnected: boolean;
  tab: TabKey;
}) {
  const [visibleCount, setVisibleCount] = useState(TABLE_PAGE_SIZE);

  // Reset pagination when the user switches tabs — each tab gets a
  // fresh "page 1".
  useEffect(() => {
    setVisibleCount(TABLE_PAGE_SIZE);
  }, [tab]);

  if (tab === "mine" && !isConnected) {
    return (
      <div className="tab-empty">
        <div className="ico">◇</div>
        Connect a wallet to see your bets.
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="tab-empty">
        <div className="ico">◇</div>
        {tab === "mine" ? (
          <>
            Your bets will appear here. <span className="mono">The chain</span>{" "}
            remembers everything.
          </>
        ) : (
          <>No bets yet. Be the first to roll.</>
        )}
      </div>
    );
  }

  const visibleRows = rows.slice(0, visibleCount);
  const hasMore = rows.length > visibleCount;
  const remaining = rows.length - visibleCount;

  return (
    <>
    <div style={{ overflowX: "auto" }}>
      <table className="dtable">
        <thead>
          <tr>
            <th className="col-time">Time</th>
            {showPlayer && <th>Player</th>}
            <th className="num">Chance</th>
            <th className="num col-roll">Roll</th>
            <th className="num">Stake</th>
            <th className="num">Payout</th>
            <th className="num">Verify</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((r) => (
            <tr key={r.requestId.toString()}>
              <td className="text-muted col-time">
                {formatRelativeTime(r.timestamp)}
              </td>
              {showPlayer && (
                <td>
                  <AddressChip address={r.player} showCopy={false} />
                </td>
              )}
              <td className="num mono">{formatPercentBps(r.rollUnder)}</td>
              <td className="num mono col-roll">
                {r.settled && r.result !== undefined ? (
                  <>
                    {String(r.result).padStart(4, "0")}{" "}
                    <span className={r.won ? "mark-win" : "mark-loss"}>
                      {r.won ? "✓" : "✗"}
                    </span>
                  </>
                ) : (
                  <span className="text-subtle">…</span>
                )}
              </td>
              <td className="num mono">{formatEthSmart(r.stake)}</td>
              <td
                className={`num mono ${
                  r.settled && r.won ? "text-gold" : "text-subtle"
                }`}
              >
                {!r.settled
                  ? "—"
                  : r.won
                    ? `+${formatEthSmart(r.payout! - r.stake)}`
                    : `−${formatEthSmart(r.stake)}`}
              </td>
              <td className="num">
                <Link
                  className="verify-btn"
                  href={`/proof/${r.requestId.toString()}`}
                  title="Verify on-chain"
                  aria-label="Verify on-chain"
                >
                  ↗
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {hasMore && (
      <div className="table-load-more">
        <button
          type="button"
          className="table-load-more-btn"
          onClick={() =>
            setVisibleCount((n) => n + TABLE_PAGE_SIZE)
          }
        >
          Load more
          <span className="table-load-more-count">
            ({Math.min(remaining, TABLE_PAGE_SIZE)} of {remaining})
          </span>
        </button>
      </div>
    )}
    </>
  );
}
