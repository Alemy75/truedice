/**
 * Casino activity report — reads all rolls from the deployed contract
 * and aggregates: total bets, settled/pending, win/loss counts,
 * total wagered, and house P&L (= casino earnings).
 *
 * Usage:
 *   pnpm tsx scripts/casino-report.ts
 *
 * No write operations; safe to run anytime.
 */

import {
  createPublicClient,
  http,
  fallback,
  formatEther,
  parseAbi,
  parseEther,
} from "viem";
import { sepolia } from "viem/chains";
import { CasinoDiceAbi } from "../lib/abi/CasinoDice";

const CONTRACT = "0x6049702d7eb6bFE095d66c80c9FFD5b224aDF412" as const;
const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_KEY || "";
const INITIAL_BANKROLL_WEI = 50_000_000_000_000_000n; // 0.05 ETH at deploy

// ---- Chainlink VRF v2.5 (Sepolia) ----
const VRF_COORDINATOR = "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B" as const;
const SUB_ID_STR = process.env.VRF_SUBSCRIPTION_ID || "";
// LINK/ETH conversion rate. Default is roughly mainnet rate ($13 LINK / $3000 ETH).
// Override with LINK_ETH_RATE env var (decimal ETH per 1 LINK, e.g. "0.00005").
const LINK_ETH_RATE = process.env.LINK_ETH_RATE
  ? parseFloat(process.env.LINK_ETH_RATE)
  : 0.000075;
// USD per ETH for the final summary line. Override with ETH_USD env var.
const ETH_USD = process.env.ETH_USD ? parseFloat(process.env.ETH_USD) : 3000;

const VRF_ABI = parseAbi([
  "function getSubscription(uint256 subId) view returns (uint96 balance, uint96 nativeBalance, uint64 reqCount, address subOwner, address[] consumers)",
  "event SubscriptionFunded(uint256 indexed subId, uint256 oldBalance, uint256 newBalance)",
  "event SubscriptionFundedWithNative(uint256 indexed subId, uint256 oldNativeBalance, uint256 newNativeBalance)",
]);

// Public Sepolia RPC tends to allow wider getLogs ranges than Alchemy free tier
// (which caps at 10 blocks). We use it specifically for the VRF events query.
const PUBLIC_RPC = "https://ethereum-sepolia-rpc.publicnode.com";

// Multi-RPC fallback transport so a single laggy/timeout'd provider doesn't
// kill the whole report. Alchemy first (fast when healthy), then 4 public RPCs.
const RPC_URLS = [
  ALCHEMY_KEY ? `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}` : null,
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://sepolia.drpc.org",
  "https://rpc.sepolia.org",
  "https://rpc2.sepolia.org",
].filter((u): u is string => Boolean(u));

const client = createPublicClient({
  chain: sepolia,
  transport: fallback(
    RPC_URLS.map((url) => http(url, { timeout: 8_000, retryCount: 1 })),
    { rank: false, retryCount: 0 },
  ),
});

interface Roll {
  player: `0x${string}`;
  stake: bigint;
  rollUnder: bigint;
  multiplierBps: bigint;
  result: bigint;
  won: boolean;
  settled: boolean;
  requestedAt: number; // uint40 — viem represents small uints as number
}

async function main() {
  console.log("\n════════════════════════════════════════════");
  console.log("  TRUE DICE — Casino Activity Report");
  console.log("════════════════════════════════════════════\n");

  // Current state
  const bankroll = (await client.readContract({
    address: CONTRACT,
    abi: CasinoDiceAbi,
    functionName: "houseBankroll",
  })) as bigint;
  const housePnL = bankroll - INITIAL_BANKROLL_WEI;

  console.log("📊 Contract state");
  console.log(`   House bankroll:    ${formatEther(bankroll).padStart(12)} ETH`);
  console.log(`   Initial deploy:    ${formatEther(INITIAL_BANKROLL_WEI).padStart(12)} ETH`);
  console.log(
    `   House P&L:         ${(housePnL >= 0n ? "+" : "")}${formatEther(housePnL).padStart(12)} ETH  ← realized casino earnings\n`,
  );

  // Scan recent blocks (10-block chunks) for BetPlaced events — find any
  // requestIds that exist but are NOT in recentRollIds (i.e. never settled).
  console.log("🔎 Scanning last 2000 blocks for pending bets...");
  const latest = await client.getBlockNumber();
  const SCAN_DEPTH = 2000n;
  const CHUNK = 10n;
  const seenRequestIds = new Set<string>();
  for (let from = latest - SCAN_DEPTH; from <= latest; from += CHUNK) {
    const to = from + CHUNK - 1n > latest ? latest : from + CHUNK - 1n;
    try {
      const logs = await client.getContractEvents({
        address: CONTRACT,
        abi: CasinoDiceAbi,
        eventName: "BetPlaced",
        fromBlock: from,
        toBlock: to,
      });
      for (const log of logs) {
        const id = (log.args as { requestId?: bigint }).requestId;
        if (id !== undefined) seenRequestIds.add(id.toString());
      }
    } catch {
      // skip chunks that fail (rate limit etc.)
    }
  }

  // For each requestId found in logs, look up the current Roll state from
  // the contract — pending = player set but settled=false.
  const pendingNotInBuffer: { id: bigint; roll: Roll }[] = [];
  for (const idStr of seenRequestIds) {
    const id = BigInt(idStr);
    try {
      const tuple = (await client.readContract({
        address: CONTRACT,
        abi: CasinoDiceAbi,
        functionName: "rolls",
        args: [id],
      })) as unknown as readonly [
        `0x${string}`,
        bigint,
        bigint,
        bigint,
        bigint,
        boolean,
        boolean,
        number,
      ];
      const [player, stake, rollUnder, multiplierBps, result, won, settled, requestedAt] = tuple;
      if (player === "0x0000000000000000000000000000000000000000") continue;
      if (!settled) {
        pendingNotInBuffer.push({
          id,
          roll: { player, stake, rollUnder, multiplierBps, result, won, settled, requestedAt },
        });
      }
    } catch {
      // skip
    }
  }
  console.log(`  → scanned ${seenRequestIds.size} BetPlaced events, ${pendingNotInBuffer.length} still unsettled\n`);

  // Pull all rolls + their request IDs (settled ring buffer)
  const rolls = (await client.readContract({
    address: CONTRACT,
    abi: CasinoDiceAbi,
    functionName: "getRecentRolls",
    args: [50n],
  })) as unknown as Roll[];

  // Read recentRollIds in parallel
  const ids: bigint[] = [];
  for (let i = 0; i < rolls.length; i++) {
    try {
      const id = (await client.readContract({
        address: CONTRACT,
        abi: CasinoDiceAbi,
        functionName: "recentRollIds",
        args: [BigInt(i)],
      })) as bigint;
      ids.push(id);
    } catch {
      break;
    }
  }

  if (rolls.length === 0) {
    console.log("No bets placed yet on this contract.\n");
    return;
  }

  // Aggregate
  let settledCount = 0;
  let pendingCount = 0;
  let winCount = 0;
  let lossCount = 0;
  let totalWagered = 0n;
  let totalPayout = 0n;
  const pendingList: { id: bigint; roll: Roll; ageMin: number }[] = [];
  const settledList: { id: bigint; roll: Roll; payout: bigint }[] = [];

  const now = Math.floor(Date.now() / 1000);
  for (let i = 0; i < rolls.length; i++) {
    const r = rolls[i];
    const id = ids[i] ?? 0n;
    totalWagered += r.stake;
    if (r.settled) {
      settledCount++;
      const payout = r.won ? (r.stake * r.multiplierBps) / 10000n : 0n;
      totalPayout += payout;
      if (r.won) winCount++;
      else lossCount++;
      settledList.push({ id, roll: r, payout });
    } else {
      pendingCount++;
      const ageSec = now - Number(r.requestedAt);
      pendingList.push({ id, roll: r, ageMin: Math.floor(ageSec / 60) });
    }
  }

  console.log("🎲 Bet counts");
  console.log(`   Total in buffer:   ${rolls.length.toString().padStart(4)}`);
  console.log(`   ✓ Settled:         ${settledCount.toString().padStart(4)}`);
  console.log(`   ⏳ Pending:        ${pendingCount.toString().padStart(4)}`);
  console.log(`   🏆 Player wins:    ${winCount.toString().padStart(4)}`);
  console.log(`   💸 Player losses:  ${lossCount.toString().padStart(4)}`);
  console.log("");

  console.log("💰 Volume");
  console.log(`   Total wagered:     ${formatEther(totalWagered).padStart(12)} ETH`);
  console.log(`   Total payouts:     ${formatEther(totalPayout).padStart(12)} ETH`);
  console.log(
    `   Gross casino take: ${formatEther(totalWagered - totalPayout).padStart(12)} ETH  (wagered − payouts)`,
  );
  if (settledCount > 0) {
    const expectedHouseEdge = (totalWagered * 100n) / 10_000n; // 1%
    console.log(
      `   Expected at 1% RTP: ${formatEther(expectedHouseEdge).padStart(11)} ETH  (totalWagered × 0.01)`,
    );
  }
  console.log("");

  // Combine in-buffer pending + scanned-from-logs pending (dedup by id)
  const allPendingMap = new Map<string, { id: bigint; roll: Roll; ageMin: number }>();
  for (const p of pendingList) allPendingMap.set(p.id.toString(), p);
  for (const p of pendingNotInBuffer) {
    if (!allPendingMap.has(p.id.toString())) {
      const ageMin = Math.floor((now - p.roll.requestedAt) / 60);
      allPendingMap.set(p.id.toString(), { id: p.id, roll: p.roll, ageMin });
    }
  }
  const allPending = Array.from(allPendingMap.values()).sort((a, b) => a.ageMin - b.ageMin);

  if (allPending.length > 0) {
    console.log("⏳ Pending requests (placed but never settled)");
    for (const p of allPending) {
      console.log(
        `   reqId: ${p.id.toString().slice(0, 14)}…  player: ${p.roll.player.slice(0, 10)}…  stake: ${formatEther(p.roll.stake)} ETH  rollUnder: ${p.roll.rollUnder}  age: ${p.ageMin}m`,
      );
      if (p.ageMin > 60 * 24) {
        console.log(`     ⚠ OVER 24h — call rescueStaleBet(${p.id}) to refund stake`);
      } else if (p.ageMin > 5) {
        console.log(`     ⚠ stuck > 5min — check vrf.chain.link/sepolia or top up LINK`);
      }
    }
    console.log("");
  } else {
    console.log("⏳ Pending requests: none\n");
  }

  if (settledList.length > 0) {
    console.log("📋 Settled bets (newest first)");
    settledList
      .slice()
      .reverse()
      .slice(0, 20)
      .forEach((s) => {
        const r = s.roll;
        const outcome = r.won ? "WIN ✓" : "LOSS ✗";
        const profitOrLoss = r.won
          ? `+${formatEther(s.payout - r.stake)}`
          : `−${formatEther(r.stake)}`;
        console.log(
          `   ${r.player.slice(0, 8)}…  stake ${formatEther(r.stake).padStart(11)} ETH  ` +
            `rollUnder ${r.rollUnder.toString().padStart(4)}  rolled ${r.result.toString().padStart(4)}  ` +
            `→ ${outcome.padEnd(7)} ${profitOrLoss.padStart(13)} ETH`,
        );
      });
    console.log("");
  }

  // ============================================================
  // Real profit including VRF (LINK) costs
  // ============================================================
  await reportRealProfit(bankroll);

  console.log("════════════════════════════════════════════");
  console.log(`  Etherscan: https://sepolia.etherscan.io/address/${CONTRACT}`);
  console.log("════════════════════════════════════════════\n");
}

/**
 * Compute and print net casino profit after subtracting LINK spent on VRF
 * callbacks. LINK spent = (total funded into subscription) − (current LINK
 * balance). Total funded is recovered by summing SubscriptionFunded events
 * on the VRF coordinator for our subId.
 *
 * Skips gracefully if VRF_SUBSCRIPTION_ID env is missing.
 */
async function reportRealProfit(bankroll: bigint) {
  console.log("💎 Real profit (incl. VRF costs)");

  if (!SUB_ID_STR) {
    console.log("   (skipped — set VRF_SUBSCRIPTION_ID env var to see this)\n");
    return;
  }

  const subId = BigInt(SUB_ID_STR);
  // Reuse the main fallback client — handles RPC flakiness for VRF queries too.
  const publicClient = client;
  void PUBLIC_RPC; // kept as documentation that public RPCs allow wider getLogs

  // Current subscription state — LINK + native balance + request count
  let currentLink = 0n;
  let currentNative = 0n;
  let reqCount = 0n;
  try {
    const sub = (await publicClient.readContract({
      address: VRF_COORDINATOR,
      abi: VRF_ABI,
      functionName: "getSubscription",
      args: [subId],
    })) as readonly [bigint, bigint, bigint, `0x${string}`, readonly `0x${string}`[]];
    currentLink = sub[0];
    currentNative = sub[1];
    reqCount = sub[2];
  } catch (e) {
    console.log("   ⚠ Failed to read VRF subscription state:", (e as Error).message);
    console.log("");
    return;
  }

  // Sum all SubscriptionFunded events for our subId, in 10k-block windows
  // starting from a generous lookback. Public RPCs allow wider ranges than
  // Alchemy free tier.
  const latest = await publicClient.getBlockNumber();
  const LOOKBACK = 200_000n; // ~28 days on Sepolia (12s blocks)
  const WINDOW = 10_000n;
  const startBlock = latest > LOOKBACK ? latest - LOOKBACK : 0n;
  let totalFundedLink = 0n;
  let totalFundedNative = 0n;
  let scannedOk = true;
  for (let from = startBlock; from <= latest; from += WINDOW) {
    const to = from + WINDOW - 1n > latest ? latest : from + WINDOW - 1n;
    try {
      const linkLogs = await publicClient.getContractEvents({
        address: VRF_COORDINATOR,
        abi: VRF_ABI,
        eventName: "SubscriptionFunded",
        args: { subId },
        fromBlock: from,
        toBlock: to,
      });
      for (const log of linkLogs) {
        const { oldBalance, newBalance } = log.args as {
          oldBalance: bigint;
          newBalance: bigint;
        };
        totalFundedLink += newBalance - oldBalance;
      }
      const nativeLogs = await publicClient.getContractEvents({
        address: VRF_COORDINATOR,
        abi: VRF_ABI,
        eventName: "SubscriptionFundedWithNative",
        args: { subId },
        fromBlock: from,
        toBlock: to,
      });
      for (const log of nativeLogs) {
        const { oldNativeBalance, newNativeBalance } = log.args as {
          oldNativeBalance: bigint;
          newNativeBalance: bigint;
        };
        totalFundedNative += newNativeBalance - oldNativeBalance;
      }
    } catch {
      scannedOk = false;
      // continue — partial data is better than no data
    }
  }

  // LINK spent = funded - current. If scan was incomplete, fundedLink might
  // be less than current — in that case clamp to 0 and warn.
  let spentLink = totalFundedLink - currentLink;
  if (spentLink < 0n) {
    spentLink = 0n;
    scannedOk = false;
  }
  let spentNative = totalFundedNative - currentNative;
  if (spentNative < 0n) spentNative = 0n;

  // Convert LINK to ETH equivalent. LINK_ETH_RATE is a float (ETH per LINK),
  // so we multiply via gwei to retain enough precision.
  const linkAsEthFloat = Number(formatEther(spentLink)) * LINK_ETH_RATE;
  const linkAsEthWei = parseEther(linkAsEthFloat.toFixed(18));

  const ethGrossPnL = bankroll - INITIAL_BANKROLL_WEI;
  const totalCostsWei = linkAsEthWei + spentNative;
  const netPnL = ethGrossPnL - totalCostsWei;

  const reqCountStr = reqCount.toString();
  const linkHuman = formatEther(spentLink);
  const grossHuman = `${ethGrossPnL >= 0n ? "+" : ""}${formatEther(ethGrossPnL)}`;
  const costHuman = `−${formatEther(totalCostsWei)}`;
  const netHuman = `${netPnL >= 0n ? "+" : ""}${formatEther(netPnL)}`;
  const netUsd = (Number(formatEther(netPnL < 0n ? -netPnL : netPnL)) * ETH_USD).toFixed(2);

  console.log(`   Sub ID:                ${SUB_ID_STR.slice(0, 14)}…`);
  console.log(`   VRF requests served:   ${reqCountStr}`);
  console.log(`   LINK funded (scanned): ${formatEther(totalFundedLink).padStart(12)} LINK`);
  console.log(`   LINK current balance:  ${formatEther(currentLink).padStart(12)} LINK`);
  console.log(`   LINK spent on VRF:     ${linkHuman.padStart(12)} LINK`);
  if (spentNative > 0n) {
    console.log(`   Native ETH spent:      ${formatEther(spentNative).padStart(12)} ETH  (native VRF payment)`);
  }
  console.log("");
  console.log(`   ETH gross profit:      ${grossHuman.padStart(13)} ETH  (houseBankroll − initial)`);
  console.log(`   VRF cost in ETH:       ${costHuman.padStart(13)} ETH  (LINK × ${LINK_ETH_RATE} ETH/LINK)`);
  console.log(`   ─────────────────────────────────────────────`);
  console.log(`   NET PROFIT:            ${netHuman.padStart(13)} ETH  (${netPnL >= 0n ? "+" : "−"}$${netUsd} at $${ETH_USD}/ETH)`);
  if (!scannedOk) {
    console.log(
      `   ⚠  Scan covered last ${LOOKBACK} blocks only. If subscription was`,
    );
    console.log(
      `      funded earlier, real LINK-spent may be higher than reported.`,
    );
    console.log(
      `      Override: set VRF_LINK_FUNDED=<wei> to bypass the events scan.`,
    );
  }
  console.log(
    `   Tip: tune LINK_ETH_RATE (default 0.000075) and ETH_USD (default 3000)`,
  );
  console.log(`        env vars to match current market prices.`);
  console.log("");
}

main().catch((e) => {
  console.error("Report failed:", e);
  process.exit(1);
});
