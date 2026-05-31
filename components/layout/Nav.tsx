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
 * Layout:
 *   Desktop (≥ 960px):
 *     [LOGO]    [Dice  Live  About — absolutely centered]    [Balance · Wallet]
 *
 *   Tablet/Mobile (< 960px):
 *     [LOGO]                                  [Balance · Wallet · Burger]
 *
 * Everything except the logo lives in .nav-right, so on mobile the cluster
 * sits flush against the right edge with equal gaps between siblings.
 * Burger is the last child → rightmost position.
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
          <img src="/assets/logo.png" alt="True Dice" />
        </Link>

        {/* Desktop links — absolutely centered relative to .nav-inner. Hidden ≤ 960px. */}
        <div className="nav-links">
          <Link href="/dice">Dice</Link>
          <Link href="/dice#feed">Live</Link>
          <Link href="/about">About</Link>
        </div>

        {/* Right cluster: Balance · Wallet · Burger (mobile only).
            Equal gap=12px between every sibling. */}
        <div className="nav-right">
          <BalanceDropdown />
          <BrandedConnectButton />
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
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
