# True Dice — Provably fair on-chain dice casino

Verifiable casino dice on Ethereum Sepolia. Every roll is decided by Chainlink VRF v2.5 and settled in a single on-chain transaction. No hidden seed, no server-side RNG, no trust required.

**Submission for the Vibe-Code 48h Frontend Challenge (May 30 – June 1, 2026).**

- **Live**: https://truedice.vercel.app *(replace with final Vercel URL)*
- **Contract**: [`0xAfF7cF9887b2e59D7402BEb3CDc7822e3DE8eB9A`](https://sepolia.etherscan.io/address/0xAfF7cF9887b2e59D7402BEb3CDc7822e3DE8eB9A) — verified source on Sepolia Etherscan
- **Repo**: https://github.com/Alemy75/truedice

---

## 💰 Casino Economics — the casino has a real, enforced edge

> Contest requirement: *"The casino has an edge — this is a casino, not a charity."*

This is the most important property of the product. The edge is enforced in **three independent layers**, mathematically provable, and verifiable on-chain by any user.

### 1. House Edge = 1.00%, enforced as an immutable contract constant

In `contracts/src/CasinoDice.sol`:

```solidity
uint256 public constant HOUSE_EDGE_BPS = 100;  // 1.00%, immutable
```

Baked into the verified bytecode at the contract address above. **Cannot be changed by anyone — including the deployer — without redeploying a new contract.** Anyone can read this constant from Etherscan:

```
contract.HOUSE_EDGE_BPS() → 100
```

### 2. RTP = `(10000 − HOUSE_EDGE_BPS) / 10000` = **≤ 99.00%**, mathematically

The payout multiplier formula:

```
multiplierBps = (10000 × (10000 − HOUSE_EDGE_BPS)) / rollUnder
              = 99_000_000 / rollUnder        ← Solidity integer division
```

Expected value (RTP) for a player betting 1 ETH:

```
P(win) = rollUnder / 10000
M      = multiplierBps / 10000
RTP    = P(win) × M
       = (rollUnder × multiplierBps) / 10⁸
       ≤ (rollUnder × 99_000_000 / rollUnder) / 10⁸   [floor inequality]
       = 99_000_000 / 10⁸
       = 0.99 = 99%
```

**RTP is mathematically capped at 99%**. Solidity's `floor` division on `99_000_000 / rollUnder` rounds *down* the multiplier, which can only **reduce** the player's actual payout. So the casino's edge is **≥ 1.00%**, never less.

| rollUnder | True multiplier | Used (after `floor`) | Actual RTP |
|---|---|---|---|
| 4950 (49.5%) | 2.0000× | 2.0000× | **99.0000%** (exact) |
| 200 (2.0%) | 49.5000× | 49.5000× | **99.0000%** (exact) |
| 9800 (98.0%) | 10102.04 / 10000 | 1.0102× | **98.9996%** |
| 7777 (77.77%) | 12730.49 / 10000 | 1.2730× | **98.9961%** |

### 3. Bankroll safety: max bet ≤ 1% of casino bankroll

To prevent a single high-multiplier bet from draining the casino (variance risk), `placeBet()` enforces:

```solidity
uint256 maxBankrollRisk = stake * (multiplierBps - 10000) / 10000;
if (maxBankrollRisk * 10000 > houseBankroll * MAX_BET_BPS_OF_BANKROLL) {
    revert BetExceedsBankrollCap();
}
```

With `MAX_BET_BPS_OF_BANKROLL = 100`, the maximum potential loss from any single bet is **1% of current bankroll**. The casino cannot be wiped out by one lucky 49.5× roll.

### 4. Empirically proven via fuzz tests

`contracts/test/CasinoDice.t.sol::testFuzz_HouseEdgeConverges` runs **256 fuzz iterations** of 200 simulated bets each. After each batch:

```
expectedHousePnL ≈ totalWagered × 0.01            // 1% of wagered
assert |actualPnL − expectedHousePnL| ≤ 0.3 ETH   // ~4σ tolerance for n=200
```

Test passes with **100% line / branch / function coverage** on `CasinoDice.sol`. Reproducible locally:

```bash
forge test --root contracts --match-test testFuzz_HouseEdgeConverges -vv
forge coverage --root contracts --report summary
```

### 5. Verifiable live on Etherscan

The `houseBankroll` storage variable is `public` — anyone can query it at any time. Combined with `BetSettled` events, you can independently audit the casino's PnL:

```
total_house_pnl = Σ (stake_when_loss − (payout − stake)_when_win)
                ≈ total_wagered × 0.01
```

The first real bet on this contract (`requestId 0x8fb8...c13b`) was a player win, which **reduced** the bankroll by exactly `payout − stake = 0.0002 − 0.0001 = 0.0001 ETH` — matching the math. [View the BetSettled tx on Etherscan ↗](https://sepolia.etherscan.io/tx/0x0862522b85ff3402881ff07e331e1a671d8d32ecdd9d89f4fca0689c63b1bbb5)

---

## What works

- ✅ **Wallet connect** via RainbowKit (MetaMask + WalletConnect + Coinbase Wallet)
- ✅ **Deposit / withdraw** test ETH against an internal balance held by the casino contract
- ✅ **Place a bet** with configurable win-chance slider (2% – 98%), with live multiplier + payout-on-win readouts
- ✅ **Provably fair randomness** via Chainlink VRF v2.5 (`request → fulfillment → settle` flow visible on-chain)
- ✅ **Live event feed** of all bets via WebSocket subscription (Alchemy WSS) — updates in real time
- ✅ **Personal bet history** filtered by indexed player address
- ✅ **`/proof/[requestId]`** breakdown page with all 4 steps + Etherscan links
- ✅ **House edge baked into the math** (see Casino Economics above)
- ✅ **VRF outage fallback**: `rescueStaleBet(requestId)` allows any user to recover their stake 24h after a stalled request
- ✅ **Network mismatch banner** with one-click "Switch to Sepolia"
- ✅ **404 + error boundary** with branded copy
- ✅ **Pixel-perfect design** lifted from `claude-design-layouts/` (Cinzel display + gold-on-warm-black palette)

## What doesn't (and why)

- **No mainnet deploy** — contest is testnet-only by rules
- **No mobile-deep-link WalletConnect** — desktop-focused for the time budget
- **No i18n** — English only
- **No backend / database** — all state on-chain, all data read directly via wagmi
- **No commit-reveal RNG fallback** — relying solely on Chainlink VRF + `rescueStaleBet` (24h timeout) was a deliberate choice to keep the contract surface minimal in 48h
- **No "auto-bet" mode** — scoped as stretch goal, deprioritized for visual polish

## Why Ethereum (and not Solana)

I considered Solana Devnet seriously. For a real-money casino product, sub-second blocks and sub-cent fees would be attractive. I went with Ethereum Sepolia anyway because:

1. **48-hour Rust learning-curve risk** — Anchor + IDL + `cargo-build-sbf` can eat hours on unfamiliar tooling errors. EVM is well-trodden ground.
2. **Casino reference patterns are far more abundant on EVM** — needed VRF integration patterns to ship fast.
3. **Solana's network outage history** would be a real concern for a real-money casino product.

For a mainnet ship I'd seriously look at Base L2 — same EVM tooling but with 2s blocks and ~$0.001 fees. Sepolia's 12s blocks are workable on testnet because the wait becomes a trust-signal UI element ("we wait because Chainlink VRF is real, and that's the point").

## Hardest unknown I figured out

**Chainlink VRF v2.5 vs v2 on Sepolia.** Most public tutorials and examples are still on VRF v2, but v2.5 is the current production version with different coordinator addresses, different key hash, and a fundamentally different consumer-contract API (`VRFConsumerBaseV2Plus`, `RandomWordsRequest` struct with `extraArgs` for native vs LINK payment).

I burned ~2 hours debugging a "request not paid" error before realizing my consumer contract was importing v2 interfaces against a v2.5 coordinator. Fix: pin everything to v2.5 — both the package version (`chainlink-brownie-contracts@1.3.0`) and the Sepolia coordinator address (`0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B`).

A second hidden problem: Sepolia's LINK/ETH price feed is so depressed that the coordinator's *estimated* LINK cost for a 200k-gas callback can run to **40+ LINK** during gas spikes — completely disconnected from mainnet (~2 LINK for the same call). The pending request stayed unfulfilled for ~30 minutes until either gas dropped or I topped up the subscription. Documented as a known testnet quirk.

## What I'd build next

1. **Multiple games** — Plinko and Slots both deserve their own VRF wiring. Slots is paytable-heavy; Plinko is animation-heavy. Either fits the existing event/feed infrastructure with minimal contract changes.
2. **L2 deploy (Base)** — port the contract unchanged; only RPC + chainId + VRF coordinator address change. ~80% UX improvement for users.
3. **Auto-bet with martingale / Fibonacci strategies** — UI surface for "play 100 rolls, double on loss", with proper stop-loss and stop-win.
4. **Subgraph** for historical aggregates — high rollers, win rate leaderboards, ROI charts.
5. **NFT-gated VIP tier** — own an ERC-721, get a reduced (but non-zero) house edge.
6. **Native ETH VRF payment** — currently uses LINK; v2.5 supports native ETH which sidesteps the LINK/ETH price-feed quirk above.

## How I used AI tools

I leaned heavily on Claude (Anthropic) as my primary copilot through every layer of the build:

- **Spec + Plan**: Claude authored `TASK.md` (functional spec) and `DESIGN.md` (visual system) collaboratively over ~2h of brainstorming, then produced a detailed 27-task implementation plan in `docs/superpowers/plans/`. This was the most valuable use — having a concrete, code-level plan meant the execution phase was almost purely mechanical.
- **Smart contract**: full TDD implementation by a dispatched Claude subagent. 29 tests + fuzz test, 100% line / branch / function coverage on `CasinoDice.sol`. Took one subagent dispatch and ~10 minutes wall time.
- **Frontend foundation + atoms**: a second subagent wrote globals.css tokens, wagmi/RainbowKit providers, format/multiplier utilities with vitest tests, ABI export, and the contract hooks. ~10 min.
- **UI components (first pass, Tailwind)**: a third subagent built the initial Tailwind-translated dice page (BetForm, BetButton, DiceCanvas, Live Feed, modals). ~10 min.
- **Pixel-perfect rewrite**: when the Tailwind translation diverged from the design, I dispatched two more subagents in parallel to rewrite `/dice` and `/about` using the raw HTML/CSS class names from `claude-design-layouts/`. ~10 min each.
- **Design (separately)**: the visual mockups in `claude-design-layouts/` were generated via Claude Design from the `DESIGN.md` brief — Cinzel + warm-black + gold palette, hero banner, game tiles, dice canvas, etc.

**What worked best**: dispatching subagents *per coherent task* (entire contract, entire frontend foundation, etc.) rather than a single massive prompt. The subagent gets a fresh context window, the parent reviews the diff between tasks, errors surface early.

**What didn't work well**: my initial attempt to mechanically translate the design's HTML into Tailwind utilities. The translation lost design fidelity at every step (wrong button sizes, container overflow, mismatched fonts). Dropping back to the raw design CSS class names from `styles.css` was the right call — let the designer's CSS work as intended, only React-ify the dynamic parts.

**Concrete infrastructure that helped**:
- Detailed `TASK.md` + `DESIGN.md` + `plan.md` upfront — the subagents could read these for context without me re-explaining
- Two-phase rewrite strategy: first ship something functional, then iterate against the design
- Vercel + GitHub auto-deploy — every push from local triggered a fresh production build, no manual deploy step

## Local development

```bash
# Install
pnpm install

# Env (copy from .env.example and fill in your own keys)
cp .env.example .env

# Smart contract
pnpm contracts:test           # forge tests (29 tests)
pnpm contracts:coverage       # forge coverage --report summary
pnpm contracts:deploy         # broadcast + verify on Sepolia

# Frontend
pnpm dev                      # http://localhost:3000
pnpm test                     # vitest unit tests (18 tests)
pnpm typecheck                # tsc --noEmit
pnpm build                    # production build
```

## Stack

- **Contracts**: Solidity 0.8.24, Foundry, OpenZeppelin v5.1.0, Chainlink VRF v2.5
- **Frontend**: Next.js 15.5 (App Router), React 19, TypeScript, Tailwind v4 (`@theme` tokens) + raw design CSS, wagmi v2, viem, RainbowKit, Cinzel + Geist Sans + Geist Mono fonts
- **Hosting**: Vercel (frontend), Sepolia (contract)
- **RPC**: Alchemy (HTTPS + WebSocket for event subscription)

## Repo layout

```
contracts/        Foundry project — CasinoDice.sol + tests + deploy script
app/              Next.js App Router — /, /dice, /about, /proof/[requestId], /not-found, /error
components/       Reusable React components — Nav, modals, NetworkBanner, etc.
hooks/            wagmi hooks — useDicePhase, useCasinoBalance, useHouseBankroll, useBetEvents, useMyBets
lib/              ABI export, format utilities, multiplier math, vitest tests
public/assets/    Logo, hero banner, game tile artwork
claude-design-layouts/  Original HTML/CSS design from Claude Design (source of truth for visual)
docs/             TASK.md spec, DESIGN.md visual system, implementation plan
```

See [`TASK.md`](TASK.md), [`DESIGN.md`](DESIGN.md), and the implementation plan in [`docs/superpowers/plans/`](docs/superpowers/plans/) for the full design + execution rationale.
