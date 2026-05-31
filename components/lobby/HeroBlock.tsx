import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function HeroBlock() {
  return (
    <header className="relative min-h-screen flex items-center justify-center text-center overflow-hidden pt-[76px] px-6">
      {/* Subtle gradient backdrop — text-only hero (no external image dependency) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background: [
            "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(212,175,55,0.10) 0%, transparent 60%)",
            "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(5,4,3,0.95) 0%, transparent 70%)",
            "linear-gradient(180deg, rgba(5,4,3,0.34) 0%, transparent 18%)",
          ].join(", "),
        }}
      />
      <div className="relative z-10 max-w-[640px] mx-auto">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-foreground-subtle mb-7">
          On-chain · Chainlink VRF · Ethereum Sepolia
        </div>
        <h1 className="font-display font-semibold leading-[1.14] tracking-[0.005em] text-[clamp(30px,4.6vw,60px)] text-foreground">
          Provably fair dice.
          <br />
          <span className="text-primary font-bold">No house secrets.</span>
        </h1>
        <p className="mt-7 text-[clamp(16px,2.4vw,20px)] leading-[1.55] text-foreground-muted max-w-[540px] mx-auto">
          Every roll is decided by Chainlink VRF and settled in a single
          transaction. Verify any outcome on Etherscan in under a minute.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/dice">
            <Button
              variant="primary"
              size="xl"
              goldRim
              glow
              className="uppercase font-bold tracking-wide"
            >
              Enter Casino
            </Button>
          </Link>
          <Link href="/about">
            <Button variant="ghost" size="xl">
              How it works
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
