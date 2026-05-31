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

import { createPublicClient, http, formatEther } from "viem";
import { sepolia } from "viem/chains";
import { CasinoDiceAbi } from "../lib/abi/CasinoDice";

const CONTRACT = "0xAfF7cF9887b2e59D7402BEb3CDc7822e3DE8eB9A" as const;
const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_KEY || "";
const INITIAL_BANKROLL_WEI = 50_000_000_000_000_000n; // 0.05 ETH at deploy

const client = createPublicClient({
  chain: sepolia,
  transport: http(
    ALCHEMY_KEY
      ? `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`
      : "https://ethereum-sepolia-rpc.publicnode.com",
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

  console.log("════════════════════════════════════════════");
  console.log(`  Etherscan: https://sepolia.etherscan.io/address/${CONTRACT}`);
  console.log("════════════════════════════════════════════\n");
}

main().catch((e) => {
  console.error("Report failed:", e);
  process.exit(1);
});
