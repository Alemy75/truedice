import Link from "next/link";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";

const CONTRACT = process.env.NEXT_PUBLIC_CASINO_CONTRACT;
const ETHERSCAN_BASE = "https://sepolia.etherscan.io";
const GITHUB_URL = "https://github.com/Alemy75/truedice";

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main className="about" style={{ paddingTop: 120 }}>
        <div className="about-eyebrow eyebrow">Provably Fair · Documentation</div>
        <h1>How True Dice Works</h1>
        <p className="lede">
          No house secrets, no hidden seed, no trust required. Every roll is
          decided by Chainlink VRF and settled in a single transaction you can
          inspect on-chain.
        </p>

        <section>
          <h3>The Game</h3>
          <p>
            You choose a <span className="m">Win Chance</span> between{" "}
            <span className="m">2.00%</span> and <span className="m">98.00%</span>.
            The contract converts that to a <span className="m">Roll Under</span>{" "}
            threshold on a <span className="m">0–9999</span> range — a 49.50%
            chance means you win if the roll lands under{" "}
            <span className="m">4950</span>.
          </p>
          <p>
            The lower your win chance, the higher your{" "}
            <span className="m">Multiplier</span>. Pick your risk; the math is
            fixed and public.
          </p>
        </section>

        <section>
          <h3>The Math</h3>
          <p>
            Payout is deterministic. The multiplier is derived from your win
            chance with a flat <span className="m">1.00%</span> house edge —
            baked into the contract as an immutable constant{" "}
            <code>HOUSE_EDGE_BPS = 100</code>:
          </p>
          <div className="formula">
            {"multiplier = "}
            <span className="g">99</span>
            {` / winChance
payout     = stake × multiplier
RTP        = winChance × multiplier
           ≤ `}
            <span className="g">99.00%</span>
          </div>
          <p>
            At 49.50% win chance, the multiplier is{" "}
            <span className="m">2.0000×</span>. A{" "}
            <span className="m">0.0010 ETH</span> stake returns{" "}
            <span className="m">0.0020 ETH</span> on a win — a net profit of{" "}
            <span className="m">0.0010 ETH</span>.
          </p>
          <p>
            <strong style={{ color: "var(--color-foreground)" }}>
              Why &ldquo;≤ 99%&rdquo; and not &ldquo;= 99%&rdquo;:
            </strong>{" "}
            Solidity rounds integer division <em>down</em>. For most win
            chances the multiplier is exact (49.50% → 2.0000×), but for
            others the floor takes a fraction of a percent off the
            multiplier — which can only{" "}
            <em>reduce</em> the player&rsquo;s expected return, never
            increase it. The casino edge is{" "}
            <span className="m">≥ 1.00%</span> at all times.
          </p>
          <p>
            Empirically verified by{" "}
            <code>testFuzz_HouseEdgeConverges</code> (256 fuzz iterations
            × 200 bets) — bankroll PnL converges to{" "}
            <span className="m">total_wagered × 0.01</span> within 4σ.
          </p>
        </section>

        <section>
          <h3>The Proof</h3>
          <p>
            When you roll, the contract calls{" "}
            <code>requestRandomWords()</code> on{" "}
            <a
              className="inline"
              href="https://docs.chain.link/vrf/v2-5"
              target="_blank"
              rel="noopener noreferrer"
            >
              Chainlink VRF
            </a>
            . The oracle returns a 256-bit random word with a cryptographic
            proof that it was generated fairly and could not have been predicted
            or tampered with.
          </p>
          <p>
            The result is just <code>randomWord % 10000</code>. Anyone holding
            the <span className="m">requestId</span> can re-derive the exact
            same outcome from public chain data.{" "}
            <Link className="inline" href="/dice">
              Place a bet →
            </Link>
          </p>
        </section>

        <section>
          <h3>The Code</h3>
          <p>
            The contract is verified and open source. Read it, audit it, fork
            it. We can&rsquo;t change a deployed roll, and neither can you —
            that&rsquo;s the point.
          </p>
          <div className="about-cta">
            {CONTRACT && (
              <a
                className="btn btn-ghost-gold btn-md"
                href={`${ETHERSCAN_BASE}/address/${CONTRACT}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View contract on Etherscan ↗
              </a>
            )}
            <a
              className="btn btn-ghost btn-md"
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub ↗
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
