"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useReadContract } from "wagmi";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { ProofStep, KV } from "@/components/proof/ProofStep";
import { EtherscanLink } from "@/components/ui/EtherscanLink";
import { AddressChip } from "@/components/ui/AddressChip";
import { Button } from "@/components/ui/Button";
import { useCasinoContract } from "@/hooks/useCasinoContract";
import {
  formatEth,
  formatEthSmart,
  formatPercentBps,
  formatMultiplierBps,
} from "@/lib/format";
import { cn } from "@/lib/cn";

interface ProofData {
  player: `0x${string}`;
  stake: bigint;
  rollUnder: number;
  multiplierBps: number;
  result?: number;
  won?: boolean;
  payout?: bigint;
}

const ZERO = "0x0000000000000000000000000000000000000000";

export default function ProofPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = use(params);
  const contract = useCasinoContract();

  // Validate the URL param as a bigint up-front
  let reqId: bigint | null = null;
  let parseError = false;
  try {
    reqId = BigInt(requestId);
  } catch {
    parseError = true;
  }

  // Read the Roll struct directly from the rolls(requestId) mapping.
  // This is a single eth_call — no eth_getLogs, no block-range limits.
  const {
    data: rollRaw,
    isLoading,
    isError,
  } = useReadContract({
    ...contract,
    functionName: "rolls",
    args: reqId !== null ? [reqId] : undefined,
    query: { enabled: reqId !== null },
  });

  const data = useMemo<ProofData | null>(() => {
    if (!rollRaw) return null;
    // Solidity public mapping returns a tuple of named fields in declaration order:
    // (player, stake, rollUnder, multiplierBps, result, won, settled, requestedAt)
    const tuple = rollRaw as unknown as readonly [
      `0x${string}`, // player
      bigint, // stake (uint128)
      bigint, // rollUnder (uint64)
      bigint, // multiplierBps (uint64)
      bigint, // result (uint64)
      boolean, // won
      boolean, // settled
      number, // requestedAt (uint40 — viem maps small uints to number)
    ];
    const [player, stake, rollUnder, multiplierBps, result, won, settled] = tuple;
    if (player === ZERO) return null;
    const multBps = Number(multiplierBps);
    return {
      player,
      stake,
      rollUnder: Number(rollUnder),
      multiplierBps: multBps,
      result: settled ? Number(result) : undefined,
      won: settled ? won : undefined,
      payout: settled && won ? (stake * BigInt(multBps)) / 10000n : undefined,
    };
  }, [rollRaw]);

  const notFound = parseError || (!isLoading && (isError || data === null));

  return (
    <>
      <Nav />
      <main className="max-w-[800px] mx-auto px-6 md:px-8 pt-[120px] md:pt-[140px] pb-24">
        {notFound ? (
          <div className="text-center py-24">
            <h1 className="font-display text-4xl md:text-5xl text-foreground">
              Roll not found.
            </h1>
            <p className="mt-4 text-foreground-muted">
              The chain has no record of that request ID.
            </p>
            <Link href="/dice">
              <Button
                variant="primary"
                size="lg"
                goldRim
                glow
                className="mt-8 uppercase font-bold tracking-wide"
              >
                Back to dice
              </Button>
            </Link>
          </div>
        ) : !data ? (
          <div className="py-24 text-center text-foreground-muted">
            Loading proof…
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-start gap-5 mb-10">
              <div className="flex-1 min-w-0">
                <h1 className="font-display font-semibold tracking-[-0.02em] text-[clamp(28px,5vw,34px)] text-foreground">
                  Provably Fair Verification
                </h1>
                <div className="font-mono text-base text-foreground-muted mt-1.5">
                  Roll #
                  {requestId.length > 14
                    ? `${requestId.slice(0, 12)}…`
                    : requestId}
                </div>
              </div>
              <EtherscanLink
                type="address"
                value={contract.address}
                label="Contract on Etherscan"
                className="ml-auto h-11 px-5 rounded-md border border-primary/40 text-primary hover:bg-primary/[0.06] transition-colors text-sm"
              />
            </div>

            <div className="flex flex-col gap-6">
              <ProofStep step={1} title="Bet Placed">
                <KV
                  label="Player"
                  value={<AddressChip address={data.player} showCopy={false} />}
                />
                <KV
                  label="Stake"
                  value={`${formatEthSmart(data.stake)} ETH`}
                />
                <KV
                  label="Roll Under"
                  value={`${data.rollUnder} (${formatPercentBps(data.rollUnder)})`}
                />
                <KV
                  label="Multiplier"
                  value={formatMultiplierBps(data.multiplierBps)}
                />
                <div className="mt-2 pt-5 border-t border-border-subtle">
                  <EtherscanLink
                    type="address"
                    value={contract.address}
                    label="Read all events on contract Etherscan ↗"
                    className="text-sm text-foreground-muted hover:text-primary"
                  />
                </div>
              </ProofStep>

              <ProofStep step={2} title="Chainlink VRF Request">
                <p className="text-[15px] leading-[1.6] text-foreground-muted mb-3">
                  Contract called{" "}
                  <code className="font-mono text-[13px] bg-surface-elevated text-foreground px-1.5 py-0.5 rounded-sm">
                    requestRandomWords()
                  </code>{" "}
                  on Chainlink VRFCoordinatorV2_5. The request is now waiting
                  for verifiable randomness.
                </p>
                <KV label="Request ID" value={requestId} wrap />
                <KV label="Confirmations required" value="3" />
              </ProofStep>

              <ProofStep step={3} title="VRF Fulfillment">
                {data.result !== undefined ? (
                  <>
                    <p className="text-[15px] leading-[1.6] text-foreground-muted mb-2">
                      Chainlink VRF oracle returned cryptographically
                      verifiable randomness. The contract computed{" "}
                      <code className="font-mono text-[13px] bg-surface-elevated text-foreground px-1.5 py-0.5 rounded-sm">
                        result = randomWord % 10000
                      </code>
                      .
                    </p>
                    <div className="bg-surface-elevated font-mono text-sm text-foreground p-4 rounded-md leading-[1.6]">
                      <span className="block eyebrow mb-2.5">
                        Result (random word mod 10000)
                      </span>
                      <span className="break-all">
                        {String(data.result).padStart(4, "0")}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="font-mono text-sm text-warning">
                    Awaiting VRF callback…
                  </p>
                )}
              </ProofStep>

              <ProofStep step={4} title="Settlement">
                {data.result !== undefined ? (
                  <>
                    <p className="text-[15px] leading-[1.6] text-foreground-muted mb-2">
                      Contract deterministically calculated the result and
                      paid out.
                    </p>
                    <pre className="font-mono text-sm leading-[1.7] bg-surface-elevated text-foreground p-5 rounded-md whitespace-pre overflow-x-auto">
{`result = randomWord % 10000
       = ${data.result}

${data.result} ${data.won ? "<" : ">="} ${data.rollUnder} (rollUnder)
       → `}
                      <span
                        className={cn(
                          "font-mono",
                          data.won ? "text-primary" : "text-danger-bright",
                        )}
                      >
                        {data.won ? "WIN ✓" : "LOSS ✗"}
                      </span>
{`

payout = ${
                        data.won
                          ? `stake × multiplier
       = ${formatEthSmart(data.stake)} × ${formatMultiplierBps(data.multiplierBps)}
       = ${formatEthSmart(data.payout ?? 0n)} ETH`
                          : `0.0000 ETH`
                      }`}
                    </pre>
                    <div
                      className={cn(
                        "mt-5 bg-surface-elevated rounded-md px-6 py-5",
                        data.won
                          ? "shadow-[var(--shadow-gold-rim-strong)]"
                          : "shadow-[inset_0_0_0_1px_rgba(139,44,44,0.5)]",
                      )}
                    >
                      <div className="eyebrow mb-2">Outcome</div>
                      <div
                        className={cn(
                          "font-mono tracking-[-0.01em] text-[clamp(22px,4vw,28px)]",
                          data.won ? "text-primary" : "text-danger-bright",
                        )}
                      >
                        {data.won
                          ? `WON +${formatEth((data.payout ?? 0n) - data.stake)} ETH net`
                          : `LOST -${formatEth(data.stake)} ETH`}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-foreground-muted">
                    Pending settlement.
                  </p>
                )}
              </ProofStep>
            </div>

            <p className="max-w-[640px] mx-auto mt-14 text-center text-[17px] leading-[1.6] text-foreground-muted italic">
              &ldquo;Anyone with the requestId and the public blockchain can
              derive this same result. We can&rsquo;t change it. We didn&rsquo;t
              generate it. That&rsquo;s the point.&rdquo;
            </p>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
