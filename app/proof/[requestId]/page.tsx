"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useReadContract } from "wagmi";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { useCasinoContract } from "@/hooks/useCasinoContract";
import {
  formatEthSmart,
  formatPercentBps,
  formatMultiplierBps,
  truncateAddress,
} from "@/lib/format";

const ETHERSCAN_BASE = "https://sepolia.etherscan.io";

interface ProofData {
  player: `0x${string}`;
  stake: bigint;
  rollUnder: number;
  multiplierBps: number;
  result?: number;
  won?: boolean;
  payout?: bigint;
  settled: boolean;
}

export default function ProofPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = use(params);
  const contract = useCasinoContract();

  let reqId: bigint | null = null;
  let parseError = false;
  try {
    reqId = BigInt(requestId);
  } catch {
    parseError = true;
  }

  const { data: rollRaw, isLoading } = useReadContract({
    ...contract,
    functionName: "rolls",
    args: reqId !== null ? [reqId] : undefined,
    query: { enabled: reqId !== null },
  });

  const data = useMemo<ProofData | null>(() => {
    if (!rollRaw) return null;
    const tuple = rollRaw as unknown as readonly [
      `0x${string}`,
      bigint,
      bigint,
      bigint,
      bigint,
      boolean,
      boolean,
      number,
    ];
    const [player, stake, rollUnder, multiplierBps, result, won, settled] = tuple;
    if (player === "0x0000000000000000000000000000000000000000") return null;
    const multBps = Number(multiplierBps);
    return {
      player,
      stake,
      rollUnder: Number(rollUnder),
      multiplierBps: multBps,
      result: settled ? Number(result) : undefined,
      won: settled ? won : undefined,
      payout: settled && won ? (stake * BigInt(multBps)) / 10000n : undefined,
      settled,
    };
  }, [rollRaw]);

  const notFound = parseError || (!isLoading && data === null);

  // Display helpers
  const shortReqId =
    requestId.length > 14 ? `${requestId.slice(0, 12)}…` : requestId;

  // Build the calculation block when settled
  const calcBody = useMemo(() => {
    if (!data || !data.settled || data.result === undefined) return null;
    const cmp = data.won ? "<" : ">=";
    const verdict = data.won ? "WIN ✓" : "LOSS ✗";
    const verdictClass = data.won ? "win" : "loss";
    const payoutSection = data.won
      ? `payout = stake × multiplier
       = ${formatEthSmart(data.stake)} × ${formatMultiplierBps(data.multiplierBps)}
       = ${formatEthSmart(data.payout ?? 0n)} ETH`
      : `payout = 0.0000 ETH`;
    return (
      <>
        {`result = randomWord % 10000
       = ${data.result}

${data.result} ${cmp} ${data.rollUnder} (rollUnder)
       → `}
        <span className={verdictClass}>{verdict}</span>
        {`

${payoutSection}`}
      </>
    );
  }, [data]);

  return (
    <>
      <Nav />

      {notFound ? (
        <main className="proof">
          <div className="proof-notfound">
            <h1>Roll not found.</h1>
            <p>The chain has no record of that request ID.</p>
            <Link href="/dice" className="btn btn-primary btn-lg">
              Back to dice
            </Link>
          </div>
        </main>
      ) : !data ? (
        <main className="proof">
          <div className="proof-loading">
            <p>Loading proof…</p>
          </div>
        </main>
      ) : (
        <main className="proof" style={{ paddingTop: "calc(76px + 48px)" }}>
          {/* Header — title + Etherscan-button */}
          <div className="proof-head">
            <div>
              <h1>Provably Fair Verification</h1>
              <div className="sub">Roll #{shortReqId}</div>
            </div>
            <a
              className="btn btn-ghost-gold btn-md escan-btn"
              href={`${ETHERSCAN_BASE}/address/${contract.address}#events`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open on Etherscan ↗
            </a>
          </div>

          <div className="stepper">
            {/* Step 1 — Bet Placed */}
            <section className="step">
              <div className="step-eyebrow eyebrow">Step 1 · Bet Placed</div>
              <div className="kv">
                <div className="kv-row">
                  <span className="k">Player</span>
                  <span className="v">
                    <a
                      className="escan"
                      href={`${ETHERSCAN_BASE}/address/${data.player}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="escan-label">
                        {truncateAddress(data.player)}
                      </span>{" "}
                      ↗
                    </a>
                  </span>
                </div>
                <div className="kv-row">
                  <span className="k">Stake</span>
                  <span className="v">{formatEthSmart(data.stake)} ETH</span>
                </div>
                <div className="kv-row">
                  <span className="k">Roll Under</span>
                  <span className="v">
                    {data.rollUnder} ({formatPercentBps(data.rollUnder)})
                  </span>
                </div>
                <div className="kv-row">
                  <span className="k">Multiplier</span>
                  <span className="v">
                    {formatMultiplierBps(data.multiplierBps)}
                  </span>
                </div>
              </div>
              <div className="step-footer">
                <a
                  className="escan"
                  href={`${ETHERSCAN_BASE}/address/${contract.address}#events`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="escan-label">
                    Browse all events on contract
                  </span>{" "}
                  ↗
                </a>
              </div>
            </section>

            {/* Step 2 — VRF Request */}
            <section className="step">
              <div className="step-eyebrow eyebrow">
                Step 2 · Chainlink VRF Request
              </div>
              <p className="body">
                Contract called <code>requestRandomWords()</code> on Chainlink
                VRFCoordinatorV2_5. The request waits for cryptographically
                verifiable randomness.
              </p>
              <div className="kv">
                <div className="kv-row">
                  <span className="k">Request ID</span>
                  <span className="v wrap">{requestId}</span>
                </div>
                <div className="kv-row">
                  <span className="k">Confirmations required</span>
                  <span className="v">3</span>
                </div>
              </div>
            </section>

            {/* Step 3 — VRF Fulfillment */}
            <section className="step">
              <div className="step-eyebrow eyebrow">
                Step 3 · VRF Fulfillment
              </div>
              {data.result !== undefined ? (
                <>
                  <p className="body">
                    Chainlink VRF oracle returned a cryptographically
                    verifiable random number. The contract computed{" "}
                    <code>result = randomWord % 10000</code>.
                  </p>
                  <div className="hashbox">
                    <span className="hashbox-label eyebrow">
                      Result (random word mod 10000)
                    </span>
                    <span>{String(data.result).padStart(4, "0")}</span>
                  </div>
                </>
              ) : (
                <p className="body text-danger">Awaiting VRF callback…</p>
              )}
            </section>

            {/* Step 4 — Settlement */}
            <section className="step">
              <div className="step-eyebrow eyebrow">Step 4 · Settlement</div>
              {data.settled && data.result !== undefined ? (
                <>
                  <p className="body">
                    Contract deterministically calculated the result and paid
                    out atomically.
                  </p>
                  <div className="calc">{calcBody}</div>
                  <div
                    className={`outcome-card ${data.won ? "" : "loss"}`}
                  >
                    <div className="label eyebrow">Outcome</div>
                    <div className="val">
                      {data.won
                        ? `WON +${formatEthSmart((data.payout ?? 0n) - data.stake)} ETH net`
                        : `LOST −${formatEthSmart(data.stake)} ETH`}
                    </div>
                  </div>
                </>
              ) : (
                <p className="body">Pending settlement.</p>
              )}
            </section>
          </div>

          <p className="proof-foot">
            &ldquo;Anyone with the requestId and the public blockchain can
            derive this same result. We can&rsquo;t change it. We didn&rsquo;t
            generate it. That&rsquo;s the point.&rdquo;
          </p>
        </main>
      )}

      <Footer />
    </>
  );
}
