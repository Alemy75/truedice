"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { useBetEvents } from "@/hooks/useBetEvents";
import { formatEthSmart, formatRelativeTime, truncateAddress } from "@/lib/format";

export default function LobbyPage() {
  const events = useBetEvents();

  // Aggregate stats from on-chain events
  const stats = useMemo(() => {
    let totalWagered = 0n;
    let biggestWin24h = 0n;
    let settled = 0;
    const cutoff = Date.now() / 1000 - 86400;
    for (const e of events) {
      totalWagered += e.stake;
      if (e.settled) {
        settled++;
        if (e.won && e.timestamp >= cutoff && e.payout && e.payout > biggestWin24h) {
          biggestWin24h = e.payout;
        }
      }
    }
    return { totalWagered, biggestWin24h, settled };
  }, [events]);

  // Marquee items — recent wins only
  const wins = events.filter((e) => e.settled && e.won && e.payout && e.payout > 0n).slice(0, 20);
  const marqueeItems = wins.length > 0 ? [...wins, ...wins] : [];

  return (
    <>
      <Nav />

      {/* HERO */}
      <header className="hero">
        <div className="hero-banner">
          <picture>
            <source media="(max-width: 700px)" srcSet="/assets/hero-mobile.webp" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/hero-desktop.webp" alt="True Dice" />
          </picture>
        </div>
        <div className="container hero-inner">
          <div className="hero-text">
            <div className="hero-eyebrow">ON-CHAIN · CHAINLINK VRF · ETHEREUM SEPOLIA</div>
            <h1>
              Provably fair dice.
              <br />
              <span className="gold">No house secrets.</span>
            </h1>
            <p className="hero-sub">
              Every roll is decided by Chainlink VRF and settled in a single transaction.
              Verify any outcome on Etherscan in under a minute.
            </p>
            <div className="hero-cta">
              <Link href="/dice" className="btn btn-primary btn-xl">Enter Casino</Link>
              <Link href="/about" className="btn btn-ghost btn-xl">How it works</Link>
            </div>
          </div>
        </div>
      </header>

      {/* LOBBY (stats + games) */}
      <main className="lobby-block container">
        {/* STATS */}
        <section className="stats">
          <div className="stats-grid">
            <div className="stat">
              <div className="eyebrow">Total Wagered</div>
              <div className="stat-value">{formatEthSmart(stats.totalWagered)} ETH</div>
            </div>
            <div className="stat">
              <div className="eyebrow">Bets Settled</div>
              <div className="stat-value">{stats.settled.toLocaleString()}</div>
            </div>
            <div className="stat">
              <div className="eyebrow">Biggest Win · 24h</div>
              <div className="stat-value text-gold">+{formatEthSmart(stats.biggestWin24h)} ETH</div>
            </div>
          </div>
        </section>

        {/* GAMES */}
        <section className="section-head">
          <h2>Games</h2>
          <span className="text-muted" style={{ fontSize: 16, whiteSpace: "nowrap" }}>One live. More coming.</span>
        </section>
        <div className="lobby-grid">
          <Link href="/dice" className="tile tile-active">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="tile-img" src="/assets/games/dice.png" alt="Dice" />
            <span className="tile-scrim" />
            <span className="tile-badge"><span className="dot dot-gold dot-pulse" />Live</span>
            <span className="tile-name">DICE</span>
            <span className="tile-desc">Chainlink VRF</span>
          </Link>
          {(["Slots", "Plinko", "Roulette", "Coin Flip"] as const).map((name) => {
            const slug = name.toLowerCase().replace(" ", "");
            return (
              <div key={name} className="tile tile-soon">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="tile-img" src={`/assets/games/${slug === "coinflip" ? "coinflip" : slug}.png`} alt={name} />
                <span className="tile-scrim" />
                <span className="tile-badge"><span className="dot dot-silver" />Soon</span>
                <span className="tile-name">{name === "Coin Flip" ? "COIN FLIP" : name.toUpperCase()}</span>
                <span className="tile-desc"></span>
              </div>
            );
          })}
        </div>
      </main>

      {/* MARQUEE */}
      {marqueeItems.length > 0 && (
        <div className="marquee-wrap">
          <div className="marquee-track" id="marquee">
            {marqueeItems.map((e, i) => {
              const big = e.payout && e.payout >= 1_000_000_000_000_000_000n;
              return (
                <span key={`${e.requestId.toString()}-${i}`} className="mq-item">
                  <span className="addr"><span className="addr-text mono">{truncateAddress(e.player)}</span></span>
                  <span className="text-subtle">won</span>
                  <span className={big ? "mono text-gold" : "mono"}>+{formatEthSmart(e.payout!)} ETH</span>
                  <span className="text-subtle">on</span>
                  <span>Dice</span>
                  <span className="text-subtle">·</span>
                  <span className="mono text-subtle">{formatRelativeTime(e.timestamp)}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
