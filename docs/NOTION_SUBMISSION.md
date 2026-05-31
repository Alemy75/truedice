# 🎰 True Dice — Provably Fair Crypto Dice

**Submission for the Vibe-Code 48h Frontend Challenge (May 30 – June 1, 2026)**

A verifiable on-chain dice casino on Ethereum Sepolia. Every roll is decided by Chainlink VRF v2.5 and settled in a single transaction. No hidden seed, no server-side RNG, no trust required.

---

## 🔗 Quick links

| | |
|---|---|
| 🌐 **Live demo** | https://truedice.vercel.app |
| 💻 **GitHub repo** | https://github.com/Alemy75/truedice |
| 📜 **Smart contract** (verified) | [`0xAfF7cF9887...3DE8eB9A` on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x6049702d7eb6bFE095d66c80c9FFD5b224aDF412) |
| 📄 **Full README** | https://github.com/Alemy75/truedice/blob/main/README.md |
| 🎥 **Loom walkthrough (5 min)** | **TBD — to be recorded and added** |

---

## ✅ Contest checklist

Every requirement from the brief, mapped to evidence in the submission.

| Requirement | Implementation |
|---|---|
| **Connect a wallet** | RainbowKit (MetaMask + WalletConnect + Coinbase Wallet) |
| **Deposit test tokens** | `deposit()` payable function on the contract — test ETH lives in an internal balance |
| **Play a game** | Slider-driven dice (2%-98% win chance), Chainlink VRF rolls, live multiplier + payout readouts |
| **Win or lose tokens** | Atomic settlement in VRF callback — payout or stake forfeiture in the same transaction |
| **Withdraw to wallet** | `withdraw(amount)` — instant, single-tx return to the connected wallet |
| **Verifiable on-chain** | Verified contract source + dedicated `/proof/[requestId]` page showing all 4 steps with Etherscan deep-links |
| **Casino has an edge** | **1.00% house edge** — immutable bytecode constant, fuzz-tested over 256×200 bets with 100% coverage |
| **Polished UX** | Cinzel + gold-on-warm-black design, error states, network mismatch banner, branded 404, mobile responsive |

---

## 🎯 What's special about this submission

### 1. The casino edge is mathematically proven, not just claimed

```solidity
uint256 public constant HOUSE_EDGE_BPS = 100;  // 1.00%, immutable
```

The 1% edge is baked into the verified bytecode. The fuzz test (`testFuzz_HouseEdgeConverges`) runs 256 iterations × 200 bets each and asserts `|actualPnL − expectedPnL| ≤ 0.3 ETH`. **100% line / branch / function coverage** on `CasinoDice.sol`.

Anyone can verify on Etherscan: read `HOUSE_EDGE_BPS()` → returns `100`. The math is in the README under "Casino math".

### 2. Per-roll proof page anyone can audit

Every settled bet has a dedicated `/proof/[requestId]` URL showing:
1. **Bet placed** — player, stake, rollUnder, multiplier
2. **VRF requested** — Chainlink coordinator address, key hash, confirmations
3. **VRF fulfilled** — the random word, modulo 10000
4. **Settlement** — win/loss decision, payout, bankroll delta

With Etherscan links at every step. A paranoid player can verify everything in under a minute.

### 3. Operational resilience

- **24h stale-bet rescue** — if a VRF request stalls (Sepolia testnet quirk), any user can call `rescueStaleBet(requestId)` after 24h to recover their stake
- **Network mismatch banner** with one-click "Switch to Sepolia"
- **Multi-RPC fallback** — viem `fallback()` transport with Alchemy + 4 public RPCs
- **Branded error boundary** and 404 page

---

## ✅ What works

- **Wallet connect** via RainbowKit (MetaMask + WalletConnect + Coinbase Wallet)
- **Deposit / withdraw** test ETH against an internal contract balance, with success toasts + Etherscan tx links
- **Place a bet** with configurable win-chance slider (2%-98%), live multiplier + payout readouts
- **Provably fair randomness** via Chainlink VRF v2.5 (request → fulfillment → settle, all visible on-chain)
- **Live event feed** of all bets via WebSocket — updates in real time
- **Personal bet history** filtered by indexed player address
- **`/proof/[requestId]`** breakdown page with Etherscan deep-links for every step
- **High rollers leaderboard** on the lobby, aggregated from on-chain events
- **VRF outage rescue** — `rescueStaleBet(requestId)` recovers stuck stakes after 24h
- **Network mismatch banner**, branded 404 + error boundary
- **Pixel-perfect design** lifted from the Claude Design-generated mockups

## ⚠ What doesn't (and why)

- **No mainnet deploy** — contest is testnet-only by rules
- **No mobile WalletConnect deep-link** — desktop-focused for the time budget
- **No commit-reveal RNG fallback** — relying on Chainlink VRF + 24h `rescueStaleBet` was a deliberate scope choice
- **No auto-bet / martingale strategies** — scoped as a stretch goal, deprioritized for visual polish
- **No subgraph for historical aggregates** — all reads are direct via wagmi against the contract

---

## 🤔 Why Ethereum Sepolia (and not Solana)

I considered Solana Devnet seriously — sub-second blocks and sub-cent fees are attractive for a casino product. I picked Ethereum anyway because:

1. **48-hour Rust learning-curve risk** — Anchor + IDL + Switchboard VRF would have eaten hours on unfamiliar tooling errors. EVM is well-trodden ground.
2. **Casino + VRF reference patterns are far more abundant on EVM** — needed Chainlink VRF v2.5 integration to ship in 48h.
3. **Solana's outage history** is a real concern for a real-money casino.

**Sepolia specifically** because: free faucet ETH means contest judges can test it without funding wallets, 12s blocks turn into a UI trust-signal ("we wait *because* VRF is real"), and Chainlink VRF v2.5 has the freshest Sepolia coordinator support of any testnet.

> **For a production ship I'd pick Base L2** — same EVM tooling, 2s blocks, ~$0.003 per bet, Chainlink VRF v2.5 available. Our contract ports unchanged (just RPC + chain + VRF coordinator address). Full migration analysis in the README.

---

## 🧩 The hardest unknown I figured out

**Chainlink VRF v2.5 vs v2 on Sepolia.**

Most tutorials are still on VRF v2, but v2.5 is the current production version with a fundamentally different consumer-contract API: `VRFConsumerBaseV2Plus`, `RandomWordsRequest` struct with `extraArgs` for native vs LINK payment, different coordinator addresses, different key hash.

I burned ~2 hours debugging a `"request not paid"` error before realizing my consumer contract was importing v2 interfaces against a v2.5 coordinator. The fix: pin both the package version (`chainlink-brownie-contracts@1.3.0`) and the v2.5 Sepolia coordinator address (`0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B`).

**Bonus quirk**: Sepolia's LINK/ETH price feed is so depressed that a 200k-gas VRF callback can cost **40+ LINK** during gas spikes (mainnet equivalent: ~2 LINK). The pending request stayed unfulfilled for ~30 minutes until either gas dropped or I topped up the subscription. Documented as a known testnet quirk — solved in production by switching to native ETH payment in v2.5.

---

## 🔮 What I'd build next

1. **L2 deploy (Base)** — port the contract unchanged; only RPC + chainId + VRF coordinator address change. ~80% UX improvement for users.
2. **Multiple games** — Plinko and Slots both reuse the VRF + event-feed plumbing. Slots is paytable-heavy; Plinko is animation-heavy.
3. **Ring buffer optimization** — current `_pushRecent` does O(N) array shifts; switching to circular buffer with index pointer would reduce VRF callback gas 3×.
4. **Native ETH VRF payment** — sidesteps the Sepolia LINK/ETH price-feed quirk above. One-line change in `extraArgs`.
5. **Auto-bet with martingale / Fibonacci** — stop-loss / stop-win, UI for "play 100 rolls automatically".
6. **Subgraph** for historical aggregates — high rollers, win rate leaderboards, ROI charts.
7. **NFT-gated VIP tier** — own an ERC-721, get a reduced (but non-zero) house edge.

---

## 🤖 Bonus: how I used AI tools

I leaned heavily on **Claude (Anthropic)** as primary copilot through every layer of the build.

### What worked best

- **Spec + Plan phase (~2h):** Claude co-authored `TASK.md` (functional spec) and `DESIGN.md` (visual system) collaboratively, then produced a detailed **27-task implementation plan** in `docs/superpowers/plans/`. The single most valuable use — execution after that was almost mechanical.
- **Smart contract (subagent dispatch, ~10 min):** full TDD by a Claude subagent. 31 tests + fuzz test, **100% line/branch/function coverage** on `CasinoDice.sol`. The subagent got a clean context window and shipped a verified-on-Etherscan contract on first try.
- **Frontend foundation (subagent, ~10 min):** globals.css design tokens, wagmi/RainbowKit providers, format utilities + vitest tests, ABI export, contract hooks.
- **Design system:** visual mockups in `claude-design-layouts/` generated via **Claude Design** from the `DESIGN.md` brief — Cinzel + warm-black + gold palette, hero banner, dice canvas, etc.
- **Pixel-perfect rewrite (parallel subagents, ~10 min each):** when the initial Tailwind translation diverged from the design, I dispatched two subagents to rewrite `/dice` + `/about` using raw design CSS class names from the Claude Design mockups.

**Best meta-decision**: dispatching subagents **per coherent task** (whole contract, whole frontend foundation), not one mega-prompt. Fresh context window per dispatch → cleaner output, errors surface early in review.

### What didn't work

- **Mechanical translation of design HTML to Tailwind utilities** lost fidelity at every step (wrong button sizes, container overflow, mismatched fonts). The right call was to drop back to the raw design CSS — let the designer's CSS work as intended and only React-ify the dynamic parts.
- **Long single-prompt subagent dispatches** with 5+ subtasks tended to skip details. Splitting into smaller per-task dispatches improved hit rate dramatically.

### Concrete infrastructure that helped

- Detailed `TASK.md` + `DESIGN.md` + `plan.md` upfront — subagents could read these for context without me re-explaining
- Two-phase rewrite strategy: ship something functional first, then iterate against the design
- Vercel + GitHub auto-deploy — every push from local triggered a fresh production build, no manual deploy step
- All AI iteration history preserved in git commit log

---

## 📊 Tech stack

- **Contracts**: Solidity 0.8.24, Foundry, OpenZeppelin v5.1.0, Chainlink VRF v2.5
- **Frontend**: Next.js 15.5 (App Router), React 19, TypeScript, Tailwind v4 (`@theme` tokens) + raw design CSS, wagmi v2, viem, RainbowKit, Cinzel + Geist Sans + Geist Mono
- **Hosting**: Vercel (frontend), Sepolia (contract)
- **RPC**: Alchemy (HTTPS + WSS) with 4-RPC viem fallback transport

---

## 🎬 Loom walkthrough (5 min)

**To be recorded and added.** Will cover:
1. Live demo of full flow (connect → deposit → bet → win → withdraw)
2. Walk through `/proof/[requestId]` page — explain Chainlink VRF verification
3. Walk through Etherscan: contract `HOUSE_EDGE_BPS()` getter, `houseBankroll` storage, `BetSettled` events
4. **One thing I didn't know before**: Chainlink VRF v2.5 vs v2 — the silent breaking change in the consumer API and how I debugged the `"request not paid"` error
5. Tour of the codebase: `CasinoDice.sol` (130 lines), test suite (100% coverage), the `claude-design-layouts/` source of truth

---

*Submitted by Max Alekseev · max.alek@truelabel.io*
