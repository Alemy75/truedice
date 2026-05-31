import Link from "next/link";
import Image from "next/image";
import { TopBar } from "@/components/layout/TopBar";
import { HeroBlock } from "@/components/lobby/HeroBlock";
import { StatsBar } from "@/components/lobby/StatsBar";
import { GameTile } from "@/components/lobby/GameTile";
import { LiveTicker } from "@/components/lobby/LiveTicker";
import { EtherscanLink } from "@/components/ui/EtherscanLink";
import { truncateAddress } from "@/lib/format";

const CONTRACT = process.env.NEXT_PUBLIC_CASINO_CONTRACT;

export default function Page() {
  return (
    <>
      <TopBar />
      <main>
        <HeroBlock />

        {/* Lobby block: stats + games merged */}
        <section className="max-w-[1280px] mx-auto px-6 pt-16 pb-22">
          <StatsBar />

          <div className="mt-14 mb-8 flex flex-col gap-2">
            <h2 className="font-display font-semibold tracking-[-0.02em] text-[clamp(32px,5vw,40px)] text-foreground">
              Games
            </h2>
            <span className="text-foreground-muted text-base whitespace-nowrap">
              One live. More coming.
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
            <GameTile
              name="Dice"
              description="Chainlink VRF"
              href="/dice"
              state="live"
              image="/assets/games/dice.png"
            />
            <GameTile name="Slots" state="soon" image="/assets/games/slots.png" />
            <GameTile name="Plinko" state="soon" image="/assets/games/plinko.png" />
            <GameTile name="Roulette" state="soon" image="/assets/games/roulette.png" />
            <GameTile name="Coin Flip" state="soon" image="/assets/games/coinflip.png" />
          </div>
        </section>

        <LiveTicker />

        <footer
          id="live"
          className="border-t border-border-subtle pt-18 pb-10"
        >
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-10">
              <div>
                <Link href="/" aria-label="True Dice" className="inline-flex">
                  <Image
                    src="/assets/logo.png"
                    alt="True Dice"
                    width={120}
                    height={26}
                    className="h-[26px] w-auto"
                  />
                </Link>
                <p className="text-foreground-muted text-sm mt-3.5 max-w-[280px]">
                  Provably fair, on-chain dice. No house secrets.
                </p>
              </div>
              <div className="md:text-center">
                <div className="eyebrow mb-3">Contract</div>
                {CONTRACT ? (
                  <div className="space-y-2 md:flex md:flex-col md:items-center">
                    <span className="font-mono text-sm text-foreground">
                      {truncateAddress(CONTRACT)}
                    </span>
                    <EtherscanLink
                      type="address"
                      value={CONTRACT}
                      label="View on Etherscan"
                      className="text-sm text-foreground-muted hover:text-primary"
                    />
                  </div>
                ) : (
                  <span className="font-mono text-sm text-foreground-subtle">
                    —
                  </span>
                )}
              </div>
              <div className="md:text-right">
                <div className="eyebrow mb-3">Resources</div>
                <div className="flex flex-col gap-3 md:items-end">
                  <a
                    href="https://github.com/Alemy75/truedice"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-foreground-muted hover:text-primary transition-colors whitespace-nowrap"
                  >
                    GitHub ↗
                  </a>
                  <Link
                    href="/about"
                    className="text-sm text-foreground-muted hover:text-primary transition-colors whitespace-nowrap"
                  >
                    Provably Fair ↗
                  </Link>
                  <Link
                    href="/about"
                    className="text-sm text-foreground-muted hover:text-primary transition-colors whitespace-nowrap"
                  >
                    About ↗
                  </Link>
                </div>
              </div>
            </div>
            <div className="mt-14 pt-7 border-t border-border-subtle flex flex-wrap justify-between gap-4 text-[13px] text-foreground-subtle">
              <span>© 2026 True Dice · A TrueLabel product</span>
              <span className="md:text-right">
                Testnet only. Not available where prohibited.
              </span>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
