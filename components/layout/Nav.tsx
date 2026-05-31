"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { BalanceDropdown } from "@/components/wallet/BalanceDropdown";

/**
 * Site-wide nav header.
 *
 * Mirrors `claude-design-layouts/index.html` structure 1:1.
 * Uses global CSS classes (.nav, .nav-inner, .brand-logo, .nav-links)
 * defined in app/globals.css — do NOT translate to Tailwind utilities.
 *
 * BalanceDropdown shows "In Casino" pill + Deposit/Withdraw actions
 * once a wallet is connected. It auto-hides when disconnected
 * (returns null inside BalanceDropdown).
 */
export function Nav() {
  return (
    <nav className="nav">
      <div className="container nav-inner">
        <Link href="/" className="brand-logo" aria-label="True Dice">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/logo.png" alt="True Dice" />
        </Link>
        <div className="nav-links">
          <Link href="/dice">Dice</Link>
          <Link href="/dice#feed">Live</Link>
          <Link href="/about">About</Link>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
          <BalanceDropdown />
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus={{ smallScreen: "avatar", largeScreen: "address" }}
          />
        </div>
      </div>
    </nav>
  );
}
