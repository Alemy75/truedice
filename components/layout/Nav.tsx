"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { BalanceDropdown } from "@/components/wallet/BalanceDropdown";
import { BrandedConnectButton } from "@/components/wallet/BrandedConnectButton";
import { cn } from "@/lib/cn";

/**
 * Site-wide nav header.
 *
 * Desktop (≥ 960px):
 *   [LOGO]    [Dice  Live  About]    [Balance · Wallet]
 *
 * Tablet/Mobile (< 960px):
 *   [LOGO]                           [Balance · ☰]
 *                                            └── popover ──┐
 *                                                          │  Dice
 *                                                          │  Live
 *                                                          │  About
 *                                                          │  ──────
 *                                                          │  [Wallet]
 *                                                          └──
 *
 * On mobile the wallet pill moves INTO the burger popover so the
 * always-visible cluster collapses to just Balance + Burger (same
 * height, adjacent — reads as one unit).
 */
export function Nav() {
  const [burgerOpen, setBurgerOpen] = useState(false);
  const burgerWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!burgerWrapRef.current) return;
      if (!burgerWrapRef.current.contains(e.target as Node)) {
        setBurgerOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setBurgerOpen(false);
    }
    if (burgerOpen) {
      document.addEventListener("click", onDoc);
      document.addEventListener("keydown", onKey);
    }
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [burgerOpen]);

  return (
    <nav className="nav">
      <div className="container nav-inner">
        <Link href="/" className="brand-logo" aria-label="True Dice">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/logo.webp" alt="True Dice" />
        </Link>

        {/* Desktop nav-links — absolutely centered; hidden on tablet/mobile */}
        <div className="nav-links">
          <Link href="/dice">Dice</Link>
          <Link href="/dice#feed">Live</Link>
          <Link href="/about">About</Link>
        </div>

        {/* Right cluster */}
        <div className="nav-right">
          <BalanceDropdown />

          {/* Wallet button — desktop position. Hidden on mobile via CSS. */}
          <div className="nav-wallet-desktop">
            <BrandedConnectButton />
          </div>

          {/* Burger — mobile/tablet only. Holds nav links + the wallet
              button inside its popover so the cluster stays compact. */}
          <div className="nav-burger-wrap" ref={burgerWrapRef}>
            <button
              type="button"
              aria-label={burgerOpen ? "Close menu" : "Open menu"}
              aria-expanded={burgerOpen}
              className="nav-burger"
              onClick={(e) => {
                e.stopPropagation();
                setBurgerOpen((v) => !v);
              }}
            >
              {burgerOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className={cn("nav-burger-menu", burgerOpen && "open")}>
              <Link href="/dice" onClick={() => setBurgerOpen(false)}>
                Dice
              </Link>
              <Link href="/dice#feed" onClick={() => setBurgerOpen(false)}>
                Live
              </Link>
              <Link href="/about" onClick={() => setBurgerOpen(false)}>
                About
              </Link>
              <div className="nav-burger-menu-divider" />
              <div className="nav-burger-menu-wallet">
                <BrandedConnectButton />
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
