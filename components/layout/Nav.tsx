"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { BalanceDropdown } from "@/components/wallet/BalanceDropdown";
import { cn } from "@/lib/cn";

/**
 * Site-wide nav header.
 *
 * Layout:
 *  - Desktop (≥ 960px): logo | inline nav-links centered | wallet cluster
 *  - Tablet/Mobile (< 960px): logo | burger button | wallet cluster
 *    Burger opens a popover with the same links.
 */
export function Nav() {
  const [burgerOpen, setBurgerOpen] = useState(false);
  const burgerWrapRef = useRef<HTMLDivElement>(null);

  // Close burger popover on outside click + Escape
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

        {/* Desktop links — hidden on small/medium screens via .nav-links CSS */}
        <div className="nav-links">
          <Link href="/dice">Dice</Link>
          <Link href="/dice#feed">Live</Link>
          <Link href="/about">About</Link>
        </div>

        {/* Burger button — visible on small/medium screens */}
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

        <div className="nav-wallet">
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
