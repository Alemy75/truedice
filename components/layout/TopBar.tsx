import Link from "next/link";
import Image from "next/image";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { NetworkBadge } from "@/components/wallet/NetworkBadge";
import { BalanceDropdown } from "@/components/wallet/BalanceDropdown";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border-subtle">
      <div className="max-w-[1280px] mx-auto px-6 h-[72px] flex items-center justify-between gap-4">
        <Link href="/" aria-label="True Dice" className="inline-flex items-center">
          <Image
            src="/assets/logo.png"
            alt="True Dice"
            width={140}
            height={30}
            priority
            className="h-[30px] w-auto"
          />
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm">
          <Link
            href="/dice"
            className="text-foreground-muted hover:text-primary transition-colors"
          >
            Dice
          </Link>
          <Link
            href="/#live"
            className="text-foreground-muted hover:text-primary transition-colors"
          >
            Live
          </Link>
          <Link
            href="/about"
            className="text-foreground-muted hover:text-primary transition-colors"
          >
            About
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <BalanceDropdown />
          <NetworkBadge />
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
