import Link from "next/link";
import { Nav } from "@/components/layout/Nav";
import { EtherscanLink } from "@/components/ui/EtherscanLink";
import { truncateAddress } from "@/lib/format";

const CONTRACT = process.env.NEXT_PUBLIC_CASINO_CONTRACT;

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main className="max-w-[720px] mx-auto px-6 md:px-8 pt-[120px] md:pt-[140px] pb-24">
        <div className="eyebrow mb-6">Provably Fair · Documentation</div>
        <h1 className="font-display font-semibold tracking-[-0.025em] leading-[1.1] text-[clamp(34px,6vw,44px)] text-foreground">
          How True Dice Works
        </h1>
        <p className="text-[19px] leading-[1.6] text-foreground-muted mt-6">
          No house secrets, no hidden seed, no trust required. Every roll is
          decided by Chainlink VRF and settled in a single transaction you can
          inspect on-chain.
        </p>

        <section className="mt-14 pt-10 border-t border-border-subtle">
          <h3 className="font-display font-semibold tracking-[-0.01em] text-2xl text-foreground mb-4">
            The Game
          </h3>
          <p className="text-base leading-[1.7] text-foreground-muted mb-4">
            You choose a{" "}
            <code className="font-mono text-sm text-foreground bg-surface-elevated px-1.5 py-0.5 rounded-sm">
              Win Chance
            </code>{" "}
            between{" "}
            <code className="font-mono text-sm text-foreground bg-surface-elevated px-1.5 py-0.5 rounded-sm">
              2.00%
            </code>{" "}
            and{" "}
            <code className="font-mono text-sm text-foreground bg-surface-elevated px-1.5 py-0.5 rounded-sm">
              98.00%
            </code>
            . The contract converts that to a{" "}
            <code className="font-mono text-sm text-foreground bg-surface-elevated px-1.5 py-0.5 rounded-sm">
              Roll Under
            </code>{" "}
            threshold on a{" "}
            <code className="font-mono text-sm text-foreground bg-surface-elevated px-1.5 py-0.5 rounded-sm">
              0–9999
            </code>{" "}
            range — a 49.50% chance means you win if the roll lands under{" "}
            <code className="font-mono text-sm text-foreground bg-surface-elevated px-1.5 py-0.5 rounded-sm">
              4950
            </code>
            .
          </p>
          <p className="text-base leading-[1.7] text-foreground-muted">
            The lower your win chance, the higher your{" "}
            <code className="font-mono text-sm text-foreground bg-surface-elevated px-1.5 py-0.5 rounded-sm">
              Multiplier
            </code>
            . Pick your risk; the math is fixed and public.
          </p>
        </section>

        <section className="mt-14 pt-10 border-t border-border-subtle">
          <h3 className="font-display font-semibold tracking-[-0.01em] text-2xl text-foreground mb-4">
            The Math
          </h3>
          <p className="text-base leading-[1.7] text-foreground-muted mb-4">
            Payout is deterministic. The multiplier is derived from your win
            chance with a flat{" "}
            <code className="font-mono text-sm text-foreground bg-surface-elevated px-1.5 py-0.5 rounded-sm">
              1.00%
            </code>{" "}
            house edge:
          </p>
          <pre className="font-mono text-[15px] leading-[1.8] text-foreground bg-surface border border-border rounded-md px-6 py-5 my-5 whitespace-pre-wrap">
            {`multiplier = `}
            <span className="text-primary">99</span>
            {` / winChance
payout     = stake × multiplier
houseEdge  = `}
            <span className="text-primary">1.00%</span>
          </pre>
          <p className="text-base leading-[1.7] text-foreground-muted">
            At 49.50% win chance, the multiplier is{" "}
            <code className="font-mono text-sm text-foreground bg-surface-elevated px-1.5 py-0.5 rounded-sm">
              2.0000×
            </code>
            . A{" "}
            <code className="font-mono text-sm text-foreground bg-surface-elevated px-1.5 py-0.5 rounded-sm">
              0.0010 ETH
            </code>{" "}
            stake returns{" "}
            <code className="font-mono text-sm text-foreground bg-surface-elevated px-1.5 py-0.5 rounded-sm">
              0.0020 ETH
            </code>{" "}
            on a win — a net profit of{" "}
            <code className="font-mono text-sm text-foreground bg-surface-elevated px-1.5 py-0.5 rounded-sm">
              0.0010 ETH
            </code>
            .
          </p>
        </section>

        <section className="mt-14 pt-10 border-t border-border-subtle">
          <h3 className="font-display font-semibold tracking-[-0.01em] text-2xl text-foreground mb-4">
            The Proof
          </h3>
          <p className="text-base leading-[1.7] text-foreground-muted mb-4">
            When you roll, the contract calls{" "}
            <code className="font-mono text-sm text-foreground bg-surface-elevated px-1.5 py-0.5 rounded-sm">
              requestRandomWords()
            </code>{" "}
            on{" "}
            <a
              href="https://docs.chain.link/vrf/v2-5"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline underline-offset-[3px]"
            >
              Chainlink VRF v2.5
            </a>
            . The oracle returns a 256-bit random word with a cryptographic
            proof that it was generated fairly and could not have been
            predicted or tampered with.
          </p>
          <p className="text-base leading-[1.7] text-foreground-muted">
            The result is just{" "}
            <code className="font-mono text-sm text-foreground bg-surface-elevated px-1.5 py-0.5 rounded-sm">
              randomWord % 10000
            </code>
            . Anyone holding the{" "}
            <code className="font-mono text-sm text-foreground bg-surface-elevated px-1.5 py-0.5 rounded-sm">
              requestId
            </code>{" "}
            can re-derive the exact same outcome from public chain data.{" "}
            <Link
              href="/dice"
              className="text-primary hover:underline underline-offset-[3px]"
            >
              Place a bet
            </Link>{" "}
            and then click the verify icon on any row in the bets table.
          </p>
        </section>

        <section className="mt-14 pt-10 border-t border-border-subtle">
          <h3 className="font-display font-semibold tracking-[-0.01em] text-2xl text-foreground mb-4">
            The Code
          </h3>
          <p className="text-base leading-[1.7] text-foreground-muted mb-4">
            The contract is verified and open source. Read it, audit it, fork
            it. We can&rsquo;t change a deployed roll, and neither can you —
            that&rsquo;s the point.
          </p>
          {CONTRACT && (
            <div className="flex flex-wrap items-center gap-3 mt-7">
              <EtherscanLink
                type="address"
                value={CONTRACT}
                label={`View contract · ${truncateAddress(CONTRACT)}`}
                className="h-11 px-5 rounded-md border border-primary/40 text-primary hover:bg-primary/[0.06] transition-colors text-sm"
              />
              <a
                href="https://github.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 px-5 inline-flex items-center rounded-md text-foreground-muted hover:text-primary transition-colors text-sm"
              >
                GitHub ↗
              </a>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
