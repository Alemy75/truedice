# True Dice — Provably fair on-chain dice casino

Verifiable casino dice on Ethereum Sepolia. Every roll is decided by Chainlink VRF v2.5 and settled in a single on-chain transaction. No hidden seed, no server-side RNG, no trust required.

**Submission for the Vibe-Code 48h Frontend Challenge (May 30 – June 1, 2026).**

- **Live**: https://truedice.vercel.app *(replace with final Vercel URL)*
- **Contract**: [`0xAfF7cF9887...3DE8eB9A`](https://sepolia.etherscan.io/address/0xAfF7cF9887b2e59D7402BEb3CDc7822e3DE8eB9A) — verified source on Sepolia Etherscan
- **Repo**: https://github.com/Alemy75/truedice
- **Loom**: *(to be added — 5 min walkthrough)*

---

## 🎯 The contest checklist, point by point

| Contest requirement | How we hit it |
|---|---|
| Connect wallet | RainbowKit (MetaMask / WalletConnect / Coinbase) |
| Deposit test tokens | `deposit()` payable — ETH lives in contract |
| Play and win/lose | Slider-driven dice (2%-98% win chance), Chainlink VRF rolls |
| Withdraw to wallet | `withdraw(amount)` — instant, single-tx |
| **Verifiable on-chain** | Verified contract + per-roll `/proof/[requestId]` page + Etherscan deep-links |
| **Casino has an edge** | 1.00% house edge — **immutable bytecode constant, fuzz-tested**, see [Casino math](#-casino-math-the-1-edge-mathematically-enforced) below |
| Polished UX | Cinzel + gold-on-warm-black design, error states, network mismatch banner, branded 404 |

---

## ✅ What works

- **Wallet connect** via RainbowKit (MetaMask + WalletConnect + Coinbase Wallet)
- **Deposit / withdraw** test ETH against an internal balance held by the casino contract
- **Place a bet** with configurable win-chance slider (2%-98%), live multiplier + payout readouts
- **Provably fair randomness** via Chainlink VRF v2.5 (`request → fulfillment → settle` visible on-chain)
- **Live event feed** of all bets via WebSocket — updates in real time
- **Personal bet history** filtered by indexed player address
- **`/proof/[requestId]`** page — 4-step breakdown with Etherscan deep-links for every step
- **House edge baked into math** — see [Casino math](#-casino-math-the-1-edge-mathematically-enforced) below
- **VRF outage rescue**: `rescueStaleBet(requestId)` lets any user recover their stake 24h after a stalled VRF request
- **Network mismatch banner** with one-click "Switch to Sepolia"
- **404 + error boundary** with branded copy

## ⚠ What doesn't (and why)

- **No mainnet deploy** — contest is testnet-only by rules
- **No mobile-deep-link WalletConnect** — desktop-focused for the time budget
- **No commit-reveal RNG fallback** — relying on Chainlink VRF + 24h `rescueStaleBet` was a deliberate scope decision
- **No auto-bet / martingale strategies** — scoped as stretch goal, deprioritized for visual polish
- **No subgraph for historical aggregates** — all reads are direct via wagmi against the contract

---

## Why Ethereum Sepolia (and not Solana)

I considered Solana Devnet seriously. For a real-money casino product, sub-second blocks and sub-cent fees are attractive. I picked Ethereum anyway because:

1. **48-hour Rust learning-curve risk** — Anchor + IDL + Switchboard VRF would have eaten hours on unfamiliar tooling errors. EVM is well-trodden ground.
2. **Casino + VRF reference patterns are far more abundant on EVM** — needed Chainlink VRF v2.5 integration to ship in 48h.
3. **Solana's outage history** is a real concern for a real-money casino.

**Sepolia specifically** because: free faucet ETH = contest judges can test it without funding wallets, 12s blocks turn into a UI trust-signal ("we wait *because* VRF is real"), and Chainlink VRF v2.5 has the freshest Sepolia coordinator support of any testnet.

---

## 🚀 Production migration: Sepolia → Base L2

Sepolia is correct for the **demo**. For a real-money ship, the only sensible target is an L2 — gas on Ethereum L1 would be ~$13.50 per `placeBet()`, killing the product silently. Concrete numbers for Base (Coinbase L2), which is what I'd ship:

| Business action | Sepolia (now) | **Base L2 (production)** |
|---|---|---|
| Min bet | 0.0001 ETH (demo) | **0.005 ETH (~$15)** |
| Cost per `placeBet()` (user pays) | $0 testnet | **~$0.06** |
| Cost per VRF callback (casino pays) | ~2 LINK (broken price feed) | **~$0.012 native ETH** |
| Casino profit per bet (net of VRF) | n/a | **+$0.138** at $15 stake |
| Block confirmation | 12 s | **2 s** |
| Withdraw contract → wallet | instant | **instant** |
| Wallet → Coinbase (off-ramp) | n/a | **5-15 min, ~$1** (Base is Coinbase's native L2) |
| Wallet → Ethereum L1 (if needed) | n/a | **5-15 min, 0.3%** via Across/Hop bridge |

**Why Base wins**: Chainlink VRF v2.5 already deployed, Coinbase Wallet integration end-to-end, biggest L2 user base, EVM-identical (our contract ports unchanged).

**What changes in code**: VRF coordinator address, chain config in `lib/wagmi.ts`, new VRF subscription funded with native ETH instead of LINK. **~1 hour total.**

**On the 7-day "withdraw to L1" myth**: optimistic rollups technically need 7 days to challenge-period the native bridge. In practice no one uses it — fast bridges (Across, Hop) cost 0.3% and take 5-15 minutes, and most users off-ramp via Coinbase directly on Base. Player-facing UX = sub-15-min withdrawal to fiat.

---

## 🧩 Hardest unknown I figured out

**Chainlink VRF v2.5 vs v2 on Sepolia.** Most tutorials are still on VRF v2, but v2.5 is current production — different coordinator addresses, different key hash, fundamentally different consumer API (`VRFConsumerBaseV2Plus`, `RandomWordsRequest` struct with `extraArgs` for native vs LINK payment).

Burned ~2 hours debugging a "request not paid" error before realizing the contract was importing v2 interfaces against a v2.5 coordinator. Fix: pin `chainlink-brownie-contracts@1.3.0` and the v2.5 Sepolia coordinator (`0x9DdfaCa8...`).

Bonus quirk: Sepolia's LINK/ETH price feed is so depressed that a 200k-gas callback can cost **40+ LINK** during gas spikes (mainnet equivalent: ~2 LINK). Documented as a known testnet quirk — solved in production by switching to native ETH payment.

## 🔮 What I'd build next

1. **L2 deploy (Base)** — see migration table above. Highest-impact unlock.
2. **Multiple games** — Plinko + Slots reuse the VRF + event-feed plumbing with minimal contract changes.
3. **Ring buffer fix in `_pushRecent`** — current O(N) shift-array burns ~140k gas per VRF callback after first 50 bets. Switching to index-pointer circular buffer reduces callback gas 3×.
4. **Native ETH VRF payment** — sidesteps the LINK/ETH price-feed quirk above. One-line change.
5. **Auto-bet** with martingale / Fibonacci + stop-loss/stop-win.
6. **Subgraph** for ROI charts and leaderboards.
7. **NFT-gated VIP tier** — own an ERC-721, get reduced (non-zero) house edge.

## 🤖 How I used AI tools

I leaned heavily on Claude (Anthropic) as primary copilot through every layer:

- **Spec + Plan**: Claude co-authored `TASK.md`, `DESIGN.md`, and a detailed 27-task implementation plan in `docs/superpowers/plans/` over ~2h of back-and-forth. The single most valuable use — execution after that was almost mechanical.
- **Smart contract**: full TDD by a dispatched Claude subagent. 29 tests + fuzz test, **100% line / branch / function coverage** on `CasinoDice.sol`. ~10 min wall time.
- **Frontend foundation**: a second subagent wrote globals.css tokens, wagmi/RainbowKit providers, format utilities + vitest tests, ABI export, contract hooks. ~10 min.
- **Design system**: visual mockups generated via Claude Design from the `DESIGN.md` brief — Cinzel + warm-black + gold palette, hero banner, dice canvas, etc. Raw HTML/CSS was ported directly into `app/globals.css` and React components, then the mockup folder was deleted in cleanup.
- **Pixel-perfect rewrite**: when the initial Tailwind translation diverged from the design, I dispatched two parallel subagents to rewrite `/dice` + `/about` using raw design CSS class names. ~10 min each.

**What worked best**: dispatching subagents per *coherent task* (whole contract, whole frontend foundation), not one mega-prompt. Fresh context window per dispatch → cleaner output, errors surface early in review.

**What didn't**: mechanically translating the design HTML into Tailwind utilities lost fidelity at every step (wrong button sizes, container overflow, mismatched fonts). The right call was dropping back to the raw design CSS — let the designer's CSS do its job, React-ify only the dynamic parts.

---

# 📐 Technical deep-dive

## 💰 Casino math: the 1% edge, mathematically enforced

> Contest requirement: *"The casino has an edge — this is a casino, not a charity."*

The edge is enforced in **three independent layers**, all verifiable on-chain by any user.

### 1. House Edge = 1.00%, immutable contract constant

```solidity
uint256 public constant HOUSE_EDGE_BPS = 100;  // 1.00%, immutable
```

Baked into verified bytecode. Cannot be changed by anyone — including the deployer — without redeploying. Query via Etherscan: `contract.HOUSE_EDGE_BPS() → 100`.

### 2. RTP ≤ 99.00%, mathematically proven

```
multiplierBps = (10000 × (10000 − HOUSE_EDGE_BPS)) / rollUnder
              = 99_000_000 / rollUnder        ← Solidity floor division

RTP = P(win) × multiplier
    = (rollUnder × multiplierBps) / 10⁸
    ≤ (rollUnder × 99_000_000 / rollUnder) / 10⁸   [floor inequality]
    = 0.99 = 99%
```

Floor division on `99_000_000 / rollUnder` can only **reduce** the multiplier → casino edge is **≥ 1%**, never less.

| rollUnder | Multiplier (used) | Actual RTP |
|---|---|---|
| 4950 (49.5%) | 2.0000× | **99.0000%** |
| 200 (2.0%) | 49.5000× | **99.0000%** |
| 9800 (98.0%) | 1.0102× | **98.9996%** |
| 7777 (77.77%) | 1.2730× | **98.9961%** |

### 3. Bankroll safety: max bet ≤ 1% of bankroll

```solidity
uint256 maxBankrollRisk = stake * (multiplierBps - 10000) / 10000;
if (maxBankrollRisk * 10000 > houseBankroll * MAX_BET_BPS_OF_BANKROLL) {
    revert BetExceedsBankrollCap();
}
```

With `MAX_BET_BPS_OF_BANKROLL = 100`, a single bet can never lose more than 1% of bankroll. No single roll can wipe the casino.

### 4. Empirically verified via fuzz tests

`contracts/test/CasinoDice.t.sol::testFuzz_HouseEdgeConverges` runs 256 fuzz iterations of 200 bets each. After each batch:

```
expectedHousePnL ≈ totalWagered × 0.01
assert |actualPnL − expectedHousePnL| ≤ 0.3 ETH   // ~4σ tolerance
```

Test passes with **100% line/branch/function coverage**. Reproduce:

```bash
forge test --root contracts --match-test testFuzz_HouseEdgeConverges -vv
forge coverage --root contracts --report summary
```

### 5. Honest disclosure: demo bet sizes are sub-economic

The 1% edge is real in the bytecode. **But at our demo `MIN_BET = 0.0001 ETH`**, per-bet revenue (~0.000001 ETH) is below the per-callback VRF cost. This is **a deliberate UX choice for the contest** — judges can faucet a tiny amount of Sepolia ETH and actually play. The contract's math is independent of MIN_BET; tuning it to the per-network break-even (see [migration table](#-production-migration-sepolia--base-l2)) is what makes it profitable in production. `houseBankroll` correctly reflects 1% edge in ETH terms — LINK subscription costs are tracked separately by Chainlink.

## Local development

```bash
pnpm install
cp .env.example .env                # fill in your own keys

# Smart contract
pnpm contracts:test                 # forge tests (29 tests)
pnpm contracts:coverage             # forge coverage --report summary
pnpm contracts:deploy               # broadcast + verify on Sepolia

# Frontend
pnpm dev                            # http://localhost:3000
pnpm test                           # vitest (18 tests)
pnpm typecheck                      # tsc --noEmit
pnpm build                          # production build

# Reports
pnpm tsx scripts/casino-report.ts   # live casino P&L + pending bets
```

## Stack

- **Contracts**: Solidity 0.8.24, Foundry, OpenZeppelin v5.1.0, Chainlink VRF v2.5
- **Frontend**: Next.js 15.5 (App Router), React 19, TypeScript, raw design CSS with `:root` custom-property tokens (no Tailwind), wagmi v2, viem, RainbowKit, Cinzel + Geist Sans + Geist Mono
- **Hosting**: Vercel (frontend), Sepolia (contract)
- **RPC**: Alchemy (HTTPS + WSS) with 4-RPC viem fallback transport

## Repo layout

```
contracts/        Foundry project — CasinoDice.sol + tests + deploy script
app/              Next.js App Router — /, /dice, /about, /proof/[requestId], /not-found, /error
components/       Reusable React components — Nav, modals, NetworkBanner, etc.
hooks/            wagmi hooks — useDicePhase, useCasinoBalance, useHouseBankroll, useBetEvents, useMyBets
lib/              ABI export, format utilities, multiplier math, vitest tests
public/assets/    Logo, hero banner, game tile artwork
docs/             TASK.md spec, DESIGN.md visual system, implementation plan
scripts/          casino-report.ts (P&L + pending bets reporter)
```

See [`TASK.md`](TASK.md), [`DESIGN.md`](DESIGN.md), [`RULES.md`](RULES.md), and the implementation plan in [`docs/superpowers/plans/`](docs/superpowers/plans/) for the full design + execution rationale.
