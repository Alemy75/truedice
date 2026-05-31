# True Dice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a provably-fair on-chain dice casino on Ethereum Sepolia with Chainlink VRF v2.5, deploy to Vercel, and ship a polished product in 48 hours (start: 30.05.2026 06:00 GMT+3, deadline: 01.06.2026 06:00 GMT+3).

**Architecture:** Monolithic Solidity contract (`CasinoDice.sol`) holding player balances + house bankroll + in-flight bets, randomness via Chainlink VRF v2.5 subscription. Next.js 15 frontend reads/writes directly via wagmi v2 + viem; no backend. Live feed via WebSocket event subscription through Alchemy. Deploy: contract to Sepolia via `forge script --verify`, frontend to Vercel.

**Tech Stack:** Solidity 0.8.24, Foundry (forge), OpenZeppelin v5, Chainlink VRF v2.5. Next.js 15 (App Router), React 19, TypeScript, Tailwind v4, wagmi v2, viem, RainbowKit, shadcn/ui, framer-motion, canvas-confetti, lucide-react, Geist + Cormorant Garamond fonts.

**Specs:** [TASK.md](../../../TASK.md) (functional) + [DESIGN.md](../../../DESIGN.md) (visual). This plan references them throughout — do not duplicate content.

---

## Pre-Flight (BEFORE Task 1)

These steps require time outside our control. Complete them before starting Task 1.

- [ ] Create Chainlink VRF v2.5 subscription on Sepolia at https://vrf.chain.link → record `subId`
- [ ] Fund subscription with ≥ 5 LINK via https://faucets.chain.link/sepolia
- [ ] Get ≥ 0.5 Sepolia ETH for deployer wallet via https://sepoliafaucet.com + https://cloud.google.com/application/web3/faucet/ethereum/sepolia
- [ ] Create Alchemy app for Sepolia → record HTTPS + WSS RPC URLs
- [ ] Create WalletConnect Cloud project → record `projectId`
- [ ] Create Etherscan API key for verification
- [ ] Create empty GitHub repo `vibecode-web3-casino`
- [ ] Link Vercel to GitHub
- [ ] Confirm `pnpm` v9+ and `foundryup` installed locally (`pnpm --version`, `forge --version`)

---

## Phase 1 — Foundation (Tasks 1-2)

### Task 1: Initialize monorepo structure

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `.env.example`, `tsconfig.json`, `next.config.ts`, `pnpm-lock.yaml`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "true-dice",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "contracts:build": "forge build --root contracts",
    "contracts:test": "forge test --root contracts -vv",
    "contracts:deploy": "forge script contracts/script/Deploy.s.sol --root contracts --rpc-url $SEPOLIA_RPC_URL --broadcast --verify"
  },
  "dependencies": {
    "next": "15.0.3",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "wagmi": "^2.13.0",
    "viem": "^2.21.0",
    "@rainbow-me/rainbowkit": "^2.2.0",
    "@tanstack/react-query": "^5.59.0",
    "lucide-react": "^0.469.0",
    "framer-motion": "^11.13.0",
    "canvas-confetti": "^1.9.3",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.5",
    "geist": "^1.3.1"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/canvas-confetti": "^1.9.0",
    "typescript": "^5.7.2",
    "tailwindcss": "^4.0.0-beta.7",
    "@tailwindcss/postcss": "^4.0.0-beta.7",
    "postcss": "^8.4.49",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.16.0",
    "eslint-config-next": "15.0.3"
  },
  "packageManager": "pnpm@9.15.0"
}
```

- [ ] **Step 2: Create .gitignore**

```
# deps
node_modules/
.pnpm-store/

# next
.next/
out/

# foundry
contracts/out/
contracts/cache/
contracts/broadcast/
!contracts/broadcast/Deploy.s.sol/11155111/run-latest.json

# env
.env
.env.local
.env.*.local

# os
.DS_Store

# logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# vercel
.vercel
```

- [ ] **Step 3: Create .env.example**

```bash
# === Foundry / Contract deployment ===
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/REPLACE_ME
PRIVATE_KEY=                         # deployer key, never commit
ETHERSCAN_API_KEY=

# Chainlink VRF v2.5 Sepolia
VRF_COORDINATOR=0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B
VRF_KEY_HASH=0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae
VRF_SUBSCRIPTION_ID=
VRF_CALLBACK_GAS_LIMIT=200000
VRF_REQUEST_CONFIRMATIONS=3

# === Next.js / Frontend ===
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_ALCHEMY_KEY=
NEXT_PUBLIC_ALCHEMY_WSS=wss://eth-sepolia.g.alchemy.com/v2/REPLACE_ME
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_CASINO_CONTRACT=         # fill after deploy
```

- [ ] **Step 4: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "contracts"]
}
```

- [ ] **Step 5: Create next.config.ts**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

export default nextConfig;
```

- [ ] **Step 6: Create postcss.config.mjs**

```js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

- [ ] **Step 7: Install dependencies and commit**

Run:
```bash
pnpm install
git init && git add -A
git commit -m "chore: initialize Next.js 15 + Tailwind v4 + Foundry monorepo"
```

Expected: clean install, single commit on `main`.

---

### Task 2: Initialize Foundry project

**Files:**
- Create: `contracts/foundry.toml`, `contracts/remappings.txt`, `contracts/.gitignore`, `contracts/src/.gitkeep`, `contracts/test/.gitkeep`, `contracts/script/.gitkeep`

- [ ] **Step 1: Init Foundry project structure**

Run:
```bash
mkdir -p contracts/src contracts/test contracts/script contracts/lib
cd contracts && forge init --no-git --force --no-commit && cd ..
```

This creates default `Counter.sol` files — delete them:
```bash
rm contracts/src/Counter.sol contracts/test/Counter.t.sol contracts/script/Counter.s.sol
```

- [ ] **Step 2: Install dependencies via forge**

Run:
```bash
cd contracts
forge install OpenZeppelin/openzeppelin-contracts@v5.1.0 --no-commit --no-git
forge install smartcontractkit/chainlink-brownie-contracts@1.3.0 --no-commit --no-git
forge install foundry-rs/forge-std --no-commit --no-git
cd ..
```

- [ ] **Step 3: Create foundry.toml**

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
test = "test"
solc_version = "0.8.24"
optimizer = true
optimizer_runs = 200
via_ir = false
fs_permissions = [{ access = "read-write", path = "./broadcast" }]
ffi = false

[profile.default.fuzz]
runs = 256
seed = "0xdeadbeef"

[etherscan]
sepolia = { key = "${ETHERSCAN_API_KEY}", chain = 11155111 }

[rpc_endpoints]
sepolia = "${SEPOLIA_RPC_URL}"
```

- [ ] **Step 4: Create remappings.txt**

```
@openzeppelin/=lib/openzeppelin-contracts/
@chainlink/=lib/chainlink-brownie-contracts/contracts/
forge-std/=lib/forge-std/src/
```

- [ ] **Step 5: Verify build works on empty project**

Run:
```bash
forge build --root contracts
```

Expected: `Compiler run successful` (with no targets — empty project still validates).

- [ ] **Step 6: Commit**

```bash
git add contracts/foundry.toml contracts/remappings.txt contracts/lib contracts/.gitignore contracts/src/.gitkeep contracts/test/.gitkeep contracts/script/.gitkeep
git commit -m "chore: scaffold Foundry project with OZ v5 + Chainlink VRF v2.5"
```

---

## Phase 2 — Smart Contract (TDD) (Tasks 3-7)

> Discipline: each behavior is added test-first. Write the failing test → run to confirm RED → minimal implementation → run to confirm GREEN → refactor if needed → commit.

### Task 3: Contract — deposit / withdraw (TDD)

**Files:**
- Create: `contracts/src/CasinoDice.sol`
- Create: `contracts/test/CasinoDice.t.sol`

- [ ] **Step 1: Write failing test for deposit**

Create `contracts/test/CasinoDice.t.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";

contract CasinoDiceTest is Test {
    // Mocks injected later; placeholder addresses for compile.
    address constant ALICE = address(0xA11CE);
    address constant BOB = address(0xB0B);

    function test_DepositIncreasesBalance() public {
        // Will be filled in once contract exists. Test placeholder for now.
        revert("not implemented");
    }
}
```

Run:
```bash
forge test --root contracts --match-test test_DepositIncreasesBalance -vv
```

Expected: FAIL with "not implemented".

- [ ] **Step 2: Write minimal CasinoDice with deposit/withdraw**

Create `contracts/src/CasinoDice.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract CasinoDice is ReentrancyGuard {
    mapping(address => uint256) public balanceOf;

    event Deposited(address indexed player, uint256 amount, uint256 newBalance);
    event Withdrawn(address indexed player, uint256 amount, uint256 newBalance);

    error AmountZero();
    error InsufficientBalance();
    error TransferFailed();

    function deposit() external payable {
        if (msg.value == 0) revert AmountZero();
        balanceOf[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value, balanceOf[msg.sender]);
    }

    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert AmountZero();
        if (balanceOf[msg.sender] < amount) revert InsufficientBalance();
        balanceOf[msg.sender] -= amount;
        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(msg.sender, amount, balanceOf[msg.sender]);
    }

    receive() external payable {
        // accept ETH but do not credit; for house bankroll funding flows added later
    }
}
```

- [ ] **Step 3: Replace placeholder test with real deposit/withdraw tests**

Overwrite `contracts/test/CasinoDice.t.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CasinoDice} from "../src/CasinoDice.sol";

contract CasinoDiceTest is Test {
    CasinoDice internal casino;
    address constant ALICE = address(0xA11CE);
    address constant BOB = address(0xB0B);

    function setUp() public {
        casino = new CasinoDice();
        vm.deal(ALICE, 10 ether);
        vm.deal(BOB, 10 ether);
    }

    function test_DepositIncreasesBalance() public {
        vm.prank(ALICE);
        casino.deposit{value: 1 ether}();
        assertEq(casino.balanceOf(ALICE), 1 ether);
    }

    function test_Deposit_RevertsOnZero() public {
        vm.prank(ALICE);
        vm.expectRevert(CasinoDice.AmountZero.selector);
        casino.deposit{value: 0}();
    }

    function test_Withdraw_DecreasesBalanceAndSendsETH() public {
        vm.prank(ALICE);
        casino.deposit{value: 1 ether}();
        uint256 before = ALICE.balance;
        vm.prank(ALICE);
        casino.withdraw(0.4 ether);
        assertEq(casino.balanceOf(ALICE), 0.6 ether);
        assertEq(ALICE.balance, before + 0.4 ether);
    }

    function test_Withdraw_RevertsOnInsufficient() public {
        vm.prank(ALICE);
        casino.deposit{value: 1 ether}();
        vm.prank(ALICE);
        vm.expectRevert(CasinoDice.InsufficientBalance.selector);
        casino.withdraw(2 ether);
    }
}
```

- [ ] **Step 4: Run all tests**

Run:
```bash
forge test --root contracts -vv
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add contracts/src/CasinoDice.sol contracts/test/CasinoDice.t.sol
git commit -m "feat(contract): deposit and withdraw with internal balances"
```

---

### Task 4: Contract — VRF integration + placeBet/fulfillRandomWords (TDD)

**Files:**
- Modify: `contracts/src/CasinoDice.sol`
- Modify: `contracts/test/CasinoDice.t.sol`

- [ ] **Step 1: Write failing test for placeBet flow**

Append to `contracts/test/CasinoDice.t.sol`:

```solidity
import {VRFCoordinatorV2_5Mock} from "@chainlink/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol";

contract CasinoDiceVRFTest is Test {
    CasinoDice internal casino;
    VRFCoordinatorV2_5Mock internal coordinator;
    address constant ALICE = address(0xA11CE);
    address constant OWNER = address(0xDEAD);
    uint256 internal subId;
    bytes32 constant KEY_HASH = bytes32(uint256(1));

    function setUp() public {
        // VRFCoordinatorV2_5Mock(baseFee, gasPrice, weiPerUnitLink)
        coordinator = new VRFCoordinatorV2_5Mock(100 gwei, 1 gwei, 4_000_000_000_000_000); // 0.004 ETH per LINK
        subId = coordinator.createSubscription();
        coordinator.fundSubscription(subId, 100 ether); // mock LINK funding

        vm.prank(OWNER);
        casino = new CasinoDice(address(coordinator), KEY_HASH, subId);

        coordinator.addConsumer(subId, address(casino));

        vm.deal(ALICE, 10 ether);
        vm.deal(OWNER, 10 ether);

        vm.prank(OWNER);
        casino.depositHouseBankroll{value: 5 ether}();
    }

    function test_PlaceBet_DeductsStakeAndEmitsBetPlaced() public {
        vm.prank(ALICE);
        casino.deposit{value: 1 ether}();

        vm.prank(ALICE);
        vm.expectEmit(false, true, false, false);
        emit CasinoDice.BetPlaced(0, ALICE, 0.01 ether, 4950, 20000);
        uint256 reqId = casino.placeBet(0.01 ether, 4950);

        assertEq(casino.balanceOf(ALICE), 0.99 ether);
        (address player, uint128 stake, uint64 rollUnder, uint64 multBps, , , bool settled, ) = casino.rolls(reqId);
        assertEq(player, ALICE);
        assertEq(stake, 0.01 ether);
        assertEq(rollUnder, 4950);
        assertEq(multBps, 20000); // 99M/4950 = 20000 = 2.0000x
        assertFalse(settled);
    }

    function test_Fulfill_WinPaysOut() public {
        vm.prank(ALICE);
        casino.deposit{value: 1 ether}();

        vm.prank(ALICE);
        uint256 reqId = casino.placeBet(0.01 ether, 4950);

        // random word will roll % 10000; force a winning roll (e.g., 100)
        uint256[] memory words = new uint256[](1);
        words[0] = 100;
        coordinator.fulfillRandomWordsWithOverride(reqId, address(casino), words);

        (, , , uint64 multBps, uint64 result, bool won, bool settled, ) = casino.rolls(reqId);
        assertEq(result, 100);
        assertTrue(won);
        assertTrue(settled);
        // payout = 0.01 * 20000 / 10000 = 0.02 ETH credited
        assertEq(casino.balanceOf(ALICE), 0.99 ether + 0.02 ether);
    }

    function test_Fulfill_LossKeepsStake() public {
        vm.prank(ALICE);
        casino.deposit{value: 1 ether}();

        vm.prank(ALICE);
        uint256 reqId = casino.placeBet(0.01 ether, 4950);

        uint256[] memory words = new uint256[](1);
        words[0] = 7000; // > 4950 → loss
        coordinator.fulfillRandomWordsWithOverride(reqId, address(casino), words);

        (, , , , uint64 result, bool won, bool settled, ) = casino.rolls(reqId);
        assertEq(result, 7000);
        assertFalse(won);
        assertTrue(settled);
        assertEq(casino.balanceOf(ALICE), 0.99 ether); // no payout; stake stays out of balance
    }
}
```

Run:
```bash
forge test --root contracts --match-contract CasinoDiceVRFTest -vv
```

Expected: FAILS to compile — CasinoDice has no VRF constructor / placeBet / rolls / BetPlaced / depositHouseBankroll yet.

- [ ] **Step 2: Extend contract with VRF + placeBet + fulfillRandomWords**

Overwrite `contracts/src/CasinoDice.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {VRFConsumerBaseV2Plus} from "@chainlink/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

contract CasinoDice is VRFConsumerBaseV2Plus, ReentrancyGuard {
    // ============ Constants ============
    uint256 public constant HOUSE_EDGE_BPS = 100;            // 1.00%
    uint256 public constant MIN_BET = 0.0001 ether;
    uint256 public constant MAX_BET_BPS_OF_BANKROLL = 100;   // 1% of bankroll
    uint64 public constant MIN_ROLL_UNDER = 200;             // 2.00%
    uint64 public constant MAX_ROLL_UNDER = 9800;            // 98.00%
    uint32 public constant CALLBACK_GAS_LIMIT = 200_000;
    uint16 public constant REQUEST_CONFIRMATIONS = 3;
    uint32 public constant NUM_WORDS = 1;
    uint256 public constant STALE_BET_TIMEOUT = 24 hours;
    uint256 public constant FEED_SIZE = 50;

    // ============ State ============
    bytes32 public immutable keyHash;
    uint256 public immutable subscriptionId;

    mapping(address => uint256) public balanceOf;
    uint256 public houseBankroll;
    mapping(uint256 => Roll) public rolls;
    uint256[] public recentRollIds;

    struct Roll {
        address player;
        uint128 stake;
        uint64 rollUnder;
        uint64 multiplierBps;
        uint64 result;
        bool won;
        bool settled;
        uint40 requestedAt;
    }

    // ============ Events ============
    event Deposited(address indexed player, uint256 amount, uint256 newBalance);
    event Withdrawn(address indexed player, uint256 amount, uint256 newBalance);
    event BetPlaced(uint256 indexed requestId, address indexed player, uint128 stake, uint64 rollUnder, uint64 multiplierBps);
    event BetSettled(uint256 indexed requestId, address indexed player, uint64 result, bool won, uint256 payout);
    event HouseBankrollChanged(int256 delta, uint256 newBankroll);
    event BetRescued(uint256 indexed requestId, address indexed player, uint256 stakeReturned);

    // ============ Errors ============
    error AmountZero();
    error InsufficientBalance();
    error TransferFailed();
    error BetTooSmall();
    error BetExceedsBankrollCap();
    error InvalidRollUnder();
    error InsufficientBankroll();
    error BetNotStale();
    error BetAlreadySettled();
    error BankrollInsufficientForWithdrawal();

    constructor(address _coordinator, bytes32 _keyHash, uint256 _subId)
        VRFConsumerBaseV2Plus(_coordinator)
    {
        keyHash = _keyHash;
        subscriptionId = _subId;
    }

    // ============ Deposit / Withdraw ============
    function deposit() external payable {
        if (msg.value == 0) revert AmountZero();
        balanceOf[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value, balanceOf[msg.sender]);
    }

    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert AmountZero();
        if (balanceOf[msg.sender] < amount) revert InsufficientBalance();
        balanceOf[msg.sender] -= amount;
        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(msg.sender, amount, balanceOf[msg.sender]);
    }

    // ============ Bet flow ============
    function placeBet(uint128 stake, uint64 rollUnder) external nonReentrant returns (uint256 requestId) {
        if (stake < MIN_BET) revert BetTooSmall();
        if (rollUnder < MIN_ROLL_UNDER || rollUnder > MAX_ROLL_UNDER) revert InvalidRollUnder();
        if (balanceOf[msg.sender] < stake) revert InsufficientBalance();

        uint64 multiplierBps = uint64((10000 * (10000 - HOUSE_EDGE_BPS)) / rollUnder);
        // maximum possible payout this bet
        uint256 maxPayout = (uint256(stake) * multiplierBps) / 10000;
        uint256 maxBankrollRisk = maxPayout - stake; // house loss if win
        // cap bet exposure to 1% of bankroll
        if (maxBankrollRisk * 10000 > houseBankroll * MAX_BET_BPS_OF_BANKROLL) {
            revert BetExceedsBankrollCap();
        }

        balanceOf[msg.sender] -= stake;

        // request randomness
        requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: keyHash,
                subId: subscriptionId,
                requestConfirmations: REQUEST_CONFIRMATIONS,
                callbackGasLimit: CALLBACK_GAS_LIMIT,
                numWords: NUM_WORDS,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                )
            })
        );

        rolls[requestId] = Roll({
            player: msg.sender,
            stake: stake,
            rollUnder: rollUnder,
            multiplierBps: multiplierBps,
            result: 0,
            won: false,
            settled: false,
            requestedAt: uint40(block.timestamp)
        });

        emit BetPlaced(requestId, msg.sender, stake, rollUnder, multiplierBps);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        Roll storage r = rolls[requestId];
        if (r.settled) return; // defensive: no double-settlement
        if (r.player == address(0)) return; // unknown requestId; ignore

        uint64 result = uint64(randomWords[0] % 10000);
        r.result = result;
        r.settled = true;

        uint256 payout = 0;
        if (result < r.rollUnder) {
            r.won = true;
            payout = (uint256(r.stake) * r.multiplierBps) / 10000;
            balanceOf[r.player] += payout;
            // house loses (payout - stake); stake was already removed from player balance
            uint256 houseDelta = payout - r.stake;
            houseBankroll -= houseDelta;
            emit HouseBankrollChanged(-int256(houseDelta), houseBankroll);
        } else {
            // house wins the stake
            houseBankroll += r.stake;
            emit HouseBankrollChanged(int256(uint256(r.stake)), houseBankroll);
        }

        _pushRecent(requestId);
        emit BetSettled(requestId, r.player, result, r.won, payout);
    }

    function _pushRecent(uint256 requestId) internal {
        if (recentRollIds.length < FEED_SIZE) {
            recentRollIds.push(requestId);
        } else {
            // shift-left and append (O(FEED_SIZE)); FEED_SIZE=50 is cheap on Sepolia
            for (uint256 i = 0; i < FEED_SIZE - 1; i++) {
                recentRollIds[i] = recentRollIds[i + 1];
            }
            recentRollIds[FEED_SIZE - 1] = requestId;
        }
    }

    function getRecentRolls(uint256 n) external view returns (Roll[] memory list) {
        uint256 len = recentRollIds.length;
        uint256 take = n > len ? len : n;
        list = new Roll[](take);
        for (uint256 i = 0; i < take; i++) {
            list[i] = rolls[recentRollIds[len - take + i]];
        }
    }

    // ============ House bankroll (owner) ============
    function depositHouseBankroll() external payable onlyOwner {
        if (msg.value == 0) revert AmountZero();
        houseBankroll += msg.value;
        emit HouseBankrollChanged(int256(msg.value), houseBankroll);
    }

    function withdrawHouseBankroll(uint256 amount) external onlyOwner nonReentrant {
        if (amount > houseBankroll) revert BankrollInsufficientForWithdrawal();
        houseBankroll -= amount;
        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit HouseBankrollChanged(-int256(amount), houseBankroll);
    }

    // ============ Stale bet rescue ============
    function rescueStaleBet(uint256 requestId) external nonReentrant {
        Roll storage r = rolls[requestId];
        if (r.player == address(0)) revert BetAlreadySettled();
        if (r.settled) revert BetAlreadySettled();
        if (block.timestamp < r.requestedAt + STALE_BET_TIMEOUT) revert BetNotStale();

        r.settled = true;
        uint256 amount = r.stake;
        balanceOf[r.player] += amount;
        emit BetRescued(requestId, r.player, amount);
    }

    receive() external payable {
        // ETH sent directly with no method call goes to house bankroll
        houseBankroll += msg.value;
        emit HouseBankrollChanged(int256(msg.value), houseBankroll);
    }
}
```

- [ ] **Step 3: Run new tests + existing tests**

Run:
```bash
forge test --root contracts -vv
```

Expected: all tests PASS (4 existing + 3 new VRF tests = 7 total).

If existing tests fail because contract now needs constructor args: update `CasinoDiceTest.setUp` to construct with a mock coordinator:

```solidity
// In CasinoDiceTest.setUp() — replace `casino = new CasinoDice();` with:
VRFCoordinatorV2_5Mock coord = new VRFCoordinatorV2_5Mock(100 gwei, 1 gwei, 4_000_000_000_000_000);
uint256 sid = coord.createSubscription();
coord.fundSubscription(sid, 100 ether);
casino = new CasinoDice(address(coord), bytes32(uint256(1)), sid);
coord.addConsumer(sid, address(casino));
```

Re-run tests until all 7 pass.

- [ ] **Step 4: Commit**

```bash
git add contracts/src/CasinoDice.sol contracts/test/CasinoDice.t.sol
git commit -m "feat(contract): VRF v2.5 integration with placeBet/fulfillRandomWords"
```

---

### Task 5: Contract — bankroll cap, stale-bet rescue, invariant tests (TDD)

**Files:**
- Modify: `contracts/test/CasinoDice.t.sol`

- [ ] **Step 1: Add failing tests for guards**

Append to `CasinoDiceVRFTest`:

```solidity
function test_PlaceBet_RevertsBetTooSmall() public {
    vm.prank(ALICE);
    casino.deposit{value: 1 ether}();
    vm.prank(ALICE);
    vm.expectRevert(CasinoDice.BetTooSmall.selector);
    casino.placeBet(0.00001 ether, 4950);
}

function test_PlaceBet_RevertsInvalidRollUnder_Low() public {
    vm.prank(ALICE);
    casino.deposit{value: 1 ether}();
    vm.prank(ALICE);
    vm.expectRevert(CasinoDice.InvalidRollUnder.selector);
    casino.placeBet(0.01 ether, 100); // < MIN_ROLL_UNDER
}

function test_PlaceBet_RevertsInvalidRollUnder_High() public {
    vm.prank(ALICE);
    casino.deposit{value: 1 ether}();
    vm.prank(ALICE);
    vm.expectRevert(CasinoDice.InvalidRollUnder.selector);
    casino.placeBet(0.01 ether, 9900); // > MAX_ROLL_UNDER
}

function test_PlaceBet_RevertsBetExceedsBankrollCap() public {
    vm.prank(ALICE);
    casino.deposit{value: 1 ether}();
    // bankroll = 5 ether; cap = 1% * bankroll = 0.05 ether of MAX RISK (payout-stake)
    // pick rollUnder = 200 → multiplier = 99M/200 = 495000 = 49.5x
    // stake = 0.002 ether → maxPayout = 0.099, risk = 0.097 → exceeds 0.05
    vm.prank(ALICE);
    vm.expectRevert(CasinoDice.BetExceedsBankrollCap.selector);
    casino.placeBet(0.002 ether, 200);
}

function test_RescueStaleBet_AfterTimeout() public {
    vm.prank(ALICE);
    casino.deposit{value: 1 ether}();
    vm.prank(ALICE);
    uint256 reqId = casino.placeBet(0.01 ether, 4950);

    vm.warp(block.timestamp + 25 hours);
    casino.rescueStaleBet(reqId);

    assertEq(casino.balanceOf(ALICE), 0.99 ether + 0.01 ether);
    (, , , , , , bool settled, ) = casino.rolls(reqId);
    assertTrue(settled);
}

function test_RescueStaleBet_RevertsBeforeTimeout() public {
    vm.prank(ALICE);
    casino.deposit{value: 1 ether}();
    vm.prank(ALICE);
    uint256 reqId = casino.placeBet(0.01 ether, 4950);
    vm.expectRevert(CasinoDice.BetNotStale.selector);
    casino.rescueStaleBet(reqId);
}

function test_OnlyOwnerCanModifyBankroll() public {
    vm.prank(ALICE);
    vm.expectRevert(); // OZ Ownable v5 reverts with OwnableUnauthorizedAccount
    casino.depositHouseBankroll{value: 1 ether}();
}
```

Run:
```bash
forge test --root contracts -vv
```

Expected: PASS (contract already implements these — these tests verify the existing logic).

- [ ] **Step 2: Add house-edge convergence fuzz test**

Append:

```solidity
function testFuzz_HouseEdgeConverges(uint256 seed) public {
    seed = bound(seed, 1, type(uint256).max);
    uint256 N = 200;
    uint128 stake = 0.005 ether;
    uint64 rollUnder = 4950; // 49.5% → 2.0x

    vm.prank(ALICE);
    casino.deposit{value: 10 ether}();

    uint256 wagered = 0;
    uint256 bankrollBefore = casino.houseBankroll();

    for (uint256 i = 0; i < N; i++) {
        vm.prank(ALICE);
        uint256 reqId = casino.placeBet(stake, rollUnder);
        wagered += stake;
        uint256[] memory words = new uint256[](1);
        words[0] = uint256(keccak256(abi.encode(seed, i)));
        coordinator.fulfillRandomWordsWithOverride(reqId, address(casino), words);
    }

    uint256 bankrollAfter = casino.houseBankroll();
    int256 housePnL = int256(bankrollAfter) - int256(bankrollBefore);
    int256 expectedHouseEdge = int256(wagered * 100 / 10000); // 1% of wagered

    // assert PnL is within ±5x expected (3σ band is wide for small N; tighten in CI if needed)
    int256 diff = housePnL > expectedHouseEdge ? housePnL - expectedHouseEdge : expectedHouseEdge - housePnL;
    int256 tolerance = expectedHouseEdge * 5;
    assertLe(diff, tolerance);
}
```

Run:
```bash
forge test --root contracts --match-test testFuzz_HouseEdge -vv
```

Expected: PASS over multiple fuzz runs.

- [ ] **Step 3: Check coverage ≥ 90%**

Run:
```bash
forge coverage --root contracts --report summary
```

Expected: `src/CasinoDice.sol` coverage ≥ 90% lines, branches, functions.

If under 90%: identify uncovered branches in output and add tests. Common gaps to plug: `Withdraw_RevertsOnZero`, `Deposit_RevertsOnZero` (already covered), `WithdrawHouseBankroll_OwnerSucceeds`.

Add if missing:

```solidity
function test_WithdrawHouseBankroll_OwnerSucceeds() public {
    uint256 before = address(this).balance;
    // need to be OWNER
    vm.prank(OWNER);
    casino.withdrawHouseBankroll(1 ether);
    assertEq(casino.houseBankroll(), 4 ether);
}
```

- [ ] **Step 4: Commit**

```bash
git add contracts/test/CasinoDice.t.sol
git commit -m "test(contract): bankroll cap, stale rescue, house-edge convergence fuzz"
```

---

### Task 6: Deploy script + local broadcast simulation

**Files:**
- Create: `contracts/script/Deploy.s.sol`

- [ ] **Step 1: Create deploy script**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CasinoDice} from "../src/CasinoDice.sol";

contract Deploy is Script {
    function run() external returns (CasinoDice casino) {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address coordinator = vm.envAddress("VRF_COORDINATOR");
        bytes32 keyHash = vm.envBytes32("VRF_KEY_HASH");
        uint256 subId = vm.envUint("VRF_SUBSCRIPTION_ID");
        uint256 initialBankroll = vm.envOr("INITIAL_BANKROLL_WEI", uint256(0.3 ether));

        vm.startBroadcast(pk);
        casino = new CasinoDice(coordinator, keyHash, subId);
        if (initialBankroll > 0) {
            casino.depositHouseBankroll{value: initialBankroll}();
        }
        vm.stopBroadcast();

        console.log("CasinoDice deployed at:", address(casino));
        console.log("Initial bankroll (wei):", initialBankroll);
        console.log("VRF subscription:", subId);
        console.log("ACTION REQUIRED: add", address(casino), "as consumer on the VRF subscription");
    }
}
```

- [ ] **Step 2: Run dry-run (no broadcast)**

Run:
```bash
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
VRF_COORDINATOR=0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B \
VRF_KEY_HASH=0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae \
VRF_SUBSCRIPTION_ID=1 \
forge script contracts/script/Deploy.s.sol --root contracts --rpc-url http://localhost:8545 --sender 0xf39Fd6e51aad88F6F4ce6aB8827279cfFFb92266 -vvvv
```

Expected: simulated deploy succeeds (no `--broadcast`, no real tx). If it errors with RPC connection, run a local node first:

```bash
anvil
```

In another terminal repeat the script. Confirm output shows simulated address.

- [ ] **Step 3: Commit**

```bash
git add contracts/script/Deploy.s.sol
git commit -m "feat(contract): deploy script with auto bankroll funding"
```

---

### Task 7: Deploy to Sepolia + verify on Etherscan

> Real network deployment. Pre-flight checklist (top of plan) must be complete.

- [ ] **Step 1: Populate .env from .env.example**

Run:
```bash
cp .env.example .env
```

Edit `.env` and set:
- `SEPOLIA_RPC_URL` from Alchemy
- `PRIVATE_KEY` for deployer
- `ETHERSCAN_API_KEY`
- `VRF_SUBSCRIPTION_ID` from pre-flight

- [ ] **Step 2: Deploy with broadcast + verify**

Run:
```bash
source .env && forge script contracts/script/Deploy.s.sol \
  --root contracts \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  -vvvv
```

Expected: contract deployed; output shows `CasinoDice deployed at: 0x...` and Etherscan verification succeeded.

Record the deployed address.

- [ ] **Step 3: Add deployed contract as VRF consumer**

Go to https://vrf.chain.link/sepolia/{subId} and click `Add Consumer` → paste the deployed contract address.

Verify on the page that the consumer is listed.

- [ ] **Step 4: Smoke test via cast**

Confirm the contract is alive and house bankroll is funded:

```bash
source .env
export CONTRACT=0x...   # paste deployed address
cast call $CONTRACT "houseBankroll()(uint256)" --rpc-url $SEPOLIA_RPC_URL
```

Expected: returns `300000000000000000` (0.3 ETH or whatever you funded).

Run an actual deposit + bet to validate VRF end-to-end:

```bash
# deposit 0.01 ETH
cast send $CONTRACT "deposit()" --value 0.01ether --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY

# place a bet
cast send $CONTRACT "placeBet(uint128,uint64)" 1000000000000000 4950 --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY

# wait ~30-60s for VRF callback, then check the latest recent roll
cast call $CONTRACT "getRecentRolls(uint256)((address,uint128,uint64,uint64,uint64,bool,bool,uint40)[])" 5 --rpc-url $SEPOLIA_RPC_URL
```

Expected: latest entry has `settled=true`, a `result` value, and your address as player.

- [ ] **Step 5: Update .env with deployed address**

Edit `.env` and set:
```
NEXT_PUBLIC_CASINO_CONTRACT=0x...
```

- [ ] **Step 6: Commit deployment broadcast file**

```bash
git add contracts/broadcast/Deploy.s.sol/11155111/run-latest.json
git commit -m "chore(contract): deploy to Sepolia and verify on Etherscan"
```

---

## Phase 3 — Frontend Foundation (Tasks 8-11)

### Task 8: Tailwind v4 + globals + design tokens

**Files:**
- Create: `app/globals.css`

- [ ] **Step 1: Write globals.css with luxury palette**

Copy the full `@theme` block from [DESIGN.md §3](../../../DESIGN.md). Then add base resets:

```css
@import "tailwindcss";
@import "geist/font.css";

@font-face {
  font-family: "Cormorant Garamond";
  src: url("https://fonts.gstatic.com/s/cormorantgaramond/v16/co3bmX5slCNuHLi8bLeY9MK7whWMhyjornFLsS6V7w.woff2") format("woff2");
  font-weight: 400 700;
  font-style: normal italic;
  font-display: swap;
}

@theme {
  /* === Brand — gold spectrum === */
  --color-primary: #D4AF37;
  --color-primary-hover: #E5C76B;
  --color-primary-pressed: #B8941F;
  --color-primary-foreground: #0A0908;
  --color-accent: #C9A961;

  /* === Surfaces === */
  --color-background: #050403;
  --color-surface: #0E0C0A;
  --color-surface-elevated: #1A1714;
  --color-surface-overlay: #26211C;

  /* === Foreground === */
  --color-foreground: #F5EFE0;
  --color-foreground-muted: #B8AE9C;
  --color-foreground-subtle: #6B6358;

  /* === Borders === */
  --color-border: #2A241D;
  --color-border-subtle: #161310;
  --color-border-gold: rgba(212, 175, 55, 0.25);

  /* === Semantic === */
  --color-success: #D4AF37;
  --color-danger: #8B2C2C;
  --color-warning: #C0C0C0;

  /* === Radii === */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* === Shadows === */
  --shadow-glow-primary: 0 0 40px -4px rgba(212, 175, 55, 0.45);
  --shadow-glow-danger: 0 0 32px -4px rgba(139, 44, 44, 0.40);
  --shadow-card: 0 4px 28px -8px rgba(0, 0, 0, 0.90);
  --shadow-gold-rim: inset 0 0 0 1px rgba(212, 175, 55, 0.20);
  --shadow-gold-rim-strong: inset 0 0 0 1px rgba(212, 175, 55, 0.45);

  /* === Typography === */
  --font-display: "Cormorant Garamond", "Playfair Display", Georgia, serif;
  --font-sans: var(--font-geist-sans), system-ui, -apple-system, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;
}

*, *::before, *::after {
  box-sizing: border-box;
}

html {
  -webkit-text-size-adjust: 100%;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  background: var(--color-background);
  color: var(--color-foreground);
  font-family: var(--font-sans);
  line-height: 1.55;
  margin: 0;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: Verify build**

Run:
```bash
pnpm dev
```

Open http://localhost:3000 — should see Next.js default page (no errors). Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(ui): tailwind v4 luxury palette + base resets"
```

---

### Task 9: wagmi + RainbowKit providers

**Files:**
- Create: `lib/wagmi.ts`
- Create: `app/providers.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create wagmi config**

`lib/wagmi.ts`:

```ts
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";
import { http } from "viem";

const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_KEY ?? "";
const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

export const wagmiConfig = getDefaultConfig({
  appName: "True Dice",
  projectId: WC_PROJECT_ID,
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(
      ALCHEMY_KEY
        ? `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`
        : "https://rpc.sepolia.org"
    ),
  },
  ssr: true,
});
```

- [ ] **Step 2: Create providers wrapper**

`app/providers.tsx`:

```tsx
"use client";

import { ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";

import { wagmiConfig } from "@/lib/wagmi";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchOnWindowFocus: false,
    },
  },
});

const rainbowTheme = darkTheme({
  accentColor: "#D4AF37",
  accentColorForeground: "#0A0908",
  borderRadius: "medium",
  fontStack: "system",
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rainbowTheme} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

- [ ] **Step 3: Update layout.tsx**

```tsx
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "True Dice — Provably fair on-chain dice",
  description: "Verifiable casino dice on Ethereum Sepolia via Chainlink VRF. No house secrets.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Verify**

Run `pnpm dev`. Confirm no console errors. Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add lib/wagmi.ts app/providers.tsx app/layout.tsx
git commit -m "feat(wallet): wagmi v2 + RainbowKit providers on Sepolia"
```

---

### Task 10: Format utilities + tests

**Files:**
- Create: `lib/format.ts`
- Create: `lib/format.test.ts`
- Create: `vitest.config.ts`
- Modify: `package.json` (add vitest)

- [ ] **Step 1: Add vitest**

Run:
```bash
pnpm add -D vitest @vitest/ui @types/node
```

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Create vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 3: Write failing tests for formatters**

`lib/format.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  formatEth,
  formatPercentBps,
  formatMultiplierBps,
  truncateAddress,
  formatRequestId,
} from "./format";

describe("formatEth", () => {
  it("formats 1 ether with 4 decimals by default", () => {
    expect(formatEth(1_000_000_000_000_000_000n)).toBe("1.0000");
  });
  it("formats 0.001 ether", () => {
    expect(formatEth(1_000_000_000_000_000n)).toBe("0.0010");
  });
  it("respects custom precision", () => {
    expect(formatEth(1_500_000_000_000_000n, 2)).toBe("0.00");
  });
});

describe("formatPercentBps", () => {
  it("4950 bps → '49.50%'", () => {
    expect(formatPercentBps(4950)).toBe("49.50%");
  });
  it("200 bps → '2.00%'", () => {
    expect(formatPercentBps(200)).toBe("2.00%");
  });
});

describe("formatMultiplierBps", () => {
  it("20000 bps → '2.0000×'", () => {
    expect(formatMultiplierBps(20000)).toBe("2.0000×");
  });
  it("495000 bps → '49.5000×'", () => {
    expect(formatMultiplierBps(495000)).toBe("49.5000×");
  });
});

describe("truncateAddress", () => {
  it("returns 0x..xxxx form", () => {
    expect(truncateAddress("0x7a3f6c89d2f1234567890abcdef1234567890d2f")).toBe(
      "0x7a3f...0d2f"
    );
  });
  it("returns empty for empty string", () => {
    expect(truncateAddress("")).toBe("");
  });
});

describe("formatRequestId", () => {
  it("truncates long ids", () => {
    expect(formatRequestId("78394201845207834928374")).toBe("78394…74");
  });
});
```

Run:
```bash
pnpm test
```

Expected: FAIL — module `./format` not found.

- [ ] **Step 4: Implement format.ts**

```ts
import { formatUnits } from "viem";

export function formatEth(wei: bigint, precision: number = 4): string {
  const v = Number(formatUnits(wei, 18));
  return v.toFixed(precision);
}

export function formatPercentBps(bps: number | bigint): string {
  const n = Number(bps) / 100;
  return `${n.toFixed(2)}%`;
}

export function formatMultiplierBps(bps: number | bigint): string {
  const n = Number(bps) / 10000;
  return `${n.toFixed(4)}×`;
}

export function truncateAddress(addr: string): string {
  if (!addr) return "";
  if (addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function formatRequestId(id: string | bigint): string {
  const s = typeof id === "bigint" ? id.toString() : id;
  if (s.length <= 10) return s;
  return `${s.slice(0, 5)}…${s.slice(-2)}`;
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Math.max(0, Date.now() - timestamp * 1000);
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}
```

- [ ] **Step 5: Run tests, expect PASS**

```bash
pnpm test
```

Expected: all formatter tests PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/format.ts lib/format.test.ts vitest.config.ts package.json pnpm-lock.yaml
git commit -m "feat(lib): typed format utilities for ETH, bps, addresses"
```

---

### Task 11: Multiplier math + tests + ABI export

**Files:**
- Create: `lib/multiplier.ts`
- Create: `lib/multiplier.test.ts`
- Create: `lib/abi/CasinoDice.ts`
- Create: `hooks/useCasinoContract.ts`
- Create: `hooks/useBalance.ts`

- [ ] **Step 1: Write failing tests for multiplier math**

`lib/multiplier.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  calcMultiplierBps,
  calcWinChanceBps,
  calcProfitOnWin,
  HOUSE_EDGE_BPS,
  MIN_ROLL_UNDER,
  MAX_ROLL_UNDER,
} from "./multiplier";

describe("calcMultiplierBps", () => {
  it("rollUnder 4950 → 20000 (2.0x)", () => {
    expect(calcMultiplierBps(4950)).toBe(20000);
  });
  it("rollUnder 200 → 495000 (49.5x)", () => {
    expect(calcMultiplierBps(200)).toBe(495000);
  });
  it("rollUnder 9800 → 10102 (1.0102x)", () => {
    expect(calcMultiplierBps(9800)).toBe(10102);
  });
});

describe("calcWinChanceBps from rollUnder", () => {
  it("inverse of rollUnder for canonical points", () => {
    expect(calcWinChanceBps(4950)).toBe(4950);
  });
});

describe("calcProfitOnWin", () => {
  it("0.001 ETH at 2.0x → 0.001 profit", () => {
    const stake = 1_000_000_000_000_000n; // 0.001 ETH in wei
    const mult = 20000;
    expect(calcProfitOnWin(stake, mult)).toBe(1_000_000_000_000_000n);
  });
  it("0.001 ETH at 49.5x → 0.0485 profit", () => {
    const stake = 1_000_000_000_000_000n;
    const mult = 495000;
    // payout = 0.0495; profit = 0.0485
    expect(calcProfitOnWin(stake, mult)).toBe(48_500_000_000_000_000n);
  });
});

describe("constants", () => {
  it("HOUSE_EDGE_BPS is 100 (1.00%)", () => {
    expect(HOUSE_EDGE_BPS).toBe(100);
  });
  it("MIN_ROLL_UNDER is 200, MAX is 9800", () => {
    expect(MIN_ROLL_UNDER).toBe(200);
    expect(MAX_ROLL_UNDER).toBe(9800);
  });
});
```

Run `pnpm test` — expect FAIL (module missing).

- [ ] **Step 2: Implement multiplier.ts**

```ts
export const HOUSE_EDGE_BPS = 100;
export const MIN_ROLL_UNDER = 200;
export const MAX_ROLL_UNDER = 9800;

export function calcMultiplierBps(rollUnder: number): number {
  if (rollUnder < MIN_ROLL_UNDER || rollUnder > MAX_ROLL_UNDER) {
    throw new Error(`rollUnder out of range: ${rollUnder}`);
  }
  return Math.floor((10000 * (10000 - HOUSE_EDGE_BPS)) / rollUnder);
}

export function calcWinChanceBps(rollUnder: number): number {
  return rollUnder;
}

export function calcProfitOnWin(stakeWei: bigint, multiplierBps: number): bigint {
  const payout = (stakeWei * BigInt(multiplierBps)) / 10000n;
  return payout - stakeWei;
}

export function calcPayoutOnWin(stakeWei: bigint, multiplierBps: number): bigint {
  return (stakeWei * BigInt(multiplierBps)) / 10000n;
}
```

Run `pnpm test` — expect all tests PASS.

- [ ] **Step 3: Generate and commit typed ABI**

After Task 7's deploy, you have `contracts/out/CasinoDice.sol/CasinoDice.json`. Extract the abi:

```bash
mkdir -p lib/abi
node -e "const a=require('./contracts/out/CasinoDice.sol/CasinoDice.json'); console.log('export const CasinoDiceAbi =', JSON.stringify(a.abi, null, 2), 'as const;')" > lib/abi/CasinoDice.ts
```

Verify `lib/abi/CasinoDice.ts` exports `CasinoDiceAbi as const` for type narrowing.

- [ ] **Step 4: Create useCasinoContract hook**

`hooks/useCasinoContract.ts`:

```ts
import { useMemo } from "react";
import { type Address, getAddress } from "viem";
import { CasinoDiceAbi } from "@/lib/abi/CasinoDice";

const ADDRESS = process.env.NEXT_PUBLIC_CASINO_CONTRACT as `0x${string}` | undefined;

export function useCasinoContract() {
  return useMemo(() => {
    if (!ADDRESS) {
      throw new Error("NEXT_PUBLIC_CASINO_CONTRACT not set");
    }
    return {
      address: getAddress(ADDRESS) as Address,
      abi: CasinoDiceAbi,
    } as const;
  }, []);
}
```

- [ ] **Step 5: Create useBalance hook (player's casino balance)**

`hooks/useBalance.ts`:

```ts
import { useAccount, useReadContract, useWatchContractEvent } from "wagmi";
import { useCasinoContract } from "./useCasinoContract";

export function useCasinoBalance() {
  const { address } = useAccount();
  const contract = useCasinoContract();

  const query = useReadContract({
    ...contract,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // refetch on Deposited/Withdrawn/BetPlaced/BetSettled events for this player
  useWatchContractEvent({
    ...contract,
    eventName: "Deposited",
    args: address ? { player: address } : undefined,
    onLogs: () => query.refetch(),
  });
  useWatchContractEvent({
    ...contract,
    eventName: "Withdrawn",
    args: address ? { player: address } : undefined,
    onLogs: () => query.refetch(),
  });
  useWatchContractEvent({
    ...contract,
    eventName: "BetPlaced",
    args: address ? { player: address } : undefined,
    onLogs: () => query.refetch(),
  });
  useWatchContractEvent({
    ...contract,
    eventName: "BetSettled",
    args: address ? { player: address } : undefined,
    onLogs: () => query.refetch(),
  });

  return query;
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/multiplier.ts lib/multiplier.test.ts lib/abi/CasinoDice.ts hooks/useCasinoContract.ts hooks/useBalance.ts
git commit -m "feat(lib): multiplier math + typed ABI + contract/balance hooks"
```

---

## Phase 4 — UI Atoms (Tasks 12-13)

### Task 12: Layout shell + core atoms (Button, AddressChip, NetworkBadge, ConnectButton)

**Files:**
- Create: `lib/cn.ts`
- Create: `components/ui/Button.tsx`
- Create: `components/ui/AddressChip.tsx`
- Create: `components/wallet/NetworkBadge.tsx`
- Create: `components/wallet/ConnectButton.tsx`
- Create: `components/layout/TopBar.tsx`

- [ ] **Step 1: Create cn utility**

`lib/cn.ts`:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: Button atom**

`components/ui/Button.tsx`:

```tsx
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  goldRim?: boolean;
  glow?: boolean;
}

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed disabled:opacity-50 font-semibold",
  secondary:
    "bg-surface-overlay text-foreground hover:bg-surface-elevated border border-border",
  ghost:
    "bg-transparent text-foreground-muted hover:text-primary hover:bg-surface/50",
  danger:
    "bg-danger text-foreground hover:opacity-90",
};

const SIZE: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-base",
  lg: "h-13 px-6 text-base",
  xl: "h-16 px-8 text-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", goldRim, glow, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md transition-all duration-150 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
          VARIANT[variant],
          SIZE[size],
          goldRim && "shadow-[var(--shadow-gold-rim)]",
          glow && "hover:shadow-[var(--shadow-glow-primary)]",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
```

- [ ] **Step 3: AddressChip atom**

`components/ui/AddressChip.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { truncateAddress } from "@/lib/format";
import { cn } from "@/lib/cn";

interface AddressChipProps {
  address: string;
  className?: string;
  showCopy?: boolean;
}

export function AddressChip({ address, className, showCopy = true }: AddressChipProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={showCopy ? handleCopy : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-sm text-foreground hover:text-primary transition-colors",
        showCopy && "cursor-pointer",
        className
      )}
      title={address}
    >
      {truncateAddress(address)}
      {showCopy && (
        copied
          ? <Check className="w-3.5 h-3.5 text-primary" />
          : <Copy className="w-3.5 h-3.5 text-foreground-subtle" />
      )}
    </button>
  );
}
```

- [ ] **Step 4: NetworkBadge atom**

`components/wallet/NetworkBadge.tsx`:

```tsx
"use client";

import { useAccount, useChainId } from "wagmi";
import { sepolia } from "wagmi/chains";
import { cn } from "@/lib/cn";

export function NetworkBadge() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  if (!isConnected) return null;

  const onSepolia = chainId === sepolia.id;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 px-3 h-8 rounded-full border text-xs font-mono uppercase tracking-wider",
        onSepolia
          ? "border-warning/40 text-warning"
          : "border-danger text-danger"
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          onSepolia ? "bg-warning" : "bg-danger"
        )}
      />
      {onSepolia ? "Sepolia" : "Wrong Network"}
    </span>
  );
}
```

- [ ] **Step 5: ConnectButton — RainbowKit wrapper**

`components/wallet/ConnectButton.tsx`:

```tsx
"use client";

import { ConnectButton as RKConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/Button";
import { AddressChip } from "@/components/ui/AddressChip";

export function ConnectButton() {
  return (
    <RKConnectButton.Custom>
      {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
        if (!mounted) return null;
        if (!account || !chain) {
          return (
            <Button onClick={openConnectModal} variant="primary" size="md" goldRim>
              Connect Wallet
            </Button>
          );
        }
        return (
          <button
            type="button"
            onClick={openAccountModal}
            className="hover:opacity-80 transition-opacity"
          >
            <AddressChip address={account.address} showCopy={false} />
          </button>
        );
      }}
    </RKConnectButton.Custom>
  );
}
```

- [ ] **Step 6: TopBar layout**

`components/layout/TopBar.tsx`:

```tsx
import Link from "next/link";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { NetworkBadge } from "@/components/wallet/NetworkBadge";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border-subtle">
      <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="font-mono font-bold tracking-widest text-primary text-sm uppercase"
        >
          True&nbsp;Dice
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm">
          <Link href="/dice" className="text-foreground-muted hover:text-primary transition-colors">Dice</Link>
          <Link href="/#live" className="text-foreground-muted hover:text-primary transition-colors">Live</Link>
          <Link href="/about" className="text-foreground-muted hover:text-primary transition-colors">About</Link>
        </nav>
        <div className="flex items-center gap-3">
          <NetworkBadge />
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 7: Run dev, verify TopBar renders**

Add to `app/page.tsx`:
```tsx
import { TopBar } from "@/components/layout/TopBar";
export default function Page() {
  return (
    <>
      <TopBar />
      <main className="min-h-screen p-8">
        <p className="text-foreground-muted">Lobby (Task 19).</p>
      </main>
    </>
  );
}
```

Run `pnpm dev`, open http://localhost:3000. Expected: gold "TRUE DICE" wordmark left, "Connect Wallet" button right (gold), connecting opens RainbowKit modal.

- [ ] **Step 8: Commit**

```bash
git add lib/cn.ts components/ui/Button.tsx components/ui/AddressChip.tsx components/wallet/NetworkBadge.tsx components/wallet/ConnectButton.tsx components/layout/TopBar.tsx app/page.tsx
git commit -m "feat(ui): layout shell + button/address/network atoms + connect button"
```

---

### Task 13: Input + Slider atoms + BetForm

**Files:**
- Create: `components/ui/Input.tsx`
- Create: `components/ui/Slider.tsx`
- Create: `components/dice/BetForm.tsx`

- [ ] **Step 1: Input atom**

`components/ui/Input.tsx`:

```tsx
import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: "sm" | "lg";
  suffix?: ReactNode;
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, size = "lg", suffix, error, ...props }, ref) => {
    return (
      <div
        className={cn(
          "relative flex items-center bg-surface-overlay border border-border rounded-sm transition-colors focus-within:border-primary",
          error && "border-danger focus-within:border-danger",
          size === "lg" ? "h-14" : "h-10"
        )}
      >
        <input
          ref={ref}
          className={cn(
            "flex-1 bg-transparent text-foreground font-mono text-right tabular-nums focus:outline-none placeholder:text-foreground-subtle",
            size === "lg" ? "text-2xl px-4" : "text-base px-3",
            suffix ? "pr-2" : "",
            className
          )}
          {...props}
        />
        {suffix && (
          <span className="text-foreground-muted font-sans text-sm pr-4">
            {suffix}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
```

- [ ] **Step 2: Slider atom**

`components/ui/Slider.tsx`:

```tsx
"use client";

import { useRef, type ChangeEvent } from "react";
import { cn } from "@/lib/cn";

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
}

export function Slider({ value, min, max, step = 1, onChange, className }: SliderProps) {
  const ref = useRef<HTMLInputElement>(null);
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn("relative w-full h-6 flex items-center", className)}>
      <div className="absolute inset-x-0 h-1.5 bg-border-subtle rounded-full overflow-hidden">
        <div
          className="h-full bg-primary"
          style={{ width: `${pct}%` }}
        />
      </div>
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <div
        className="absolute w-6 h-6 rounded-full bg-surface-overlay border-2 border-primary shadow-lg pointer-events-none"
        style={{
          left: `calc(${pct}% - 12px)`,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: BetForm component**

`components/dice/BetForm.tsx`:

```tsx
"use client";

import { parseEther } from "viem";
import { Input } from "@/components/ui/Input";
import { Slider } from "@/components/ui/Slider";
import { Button } from "@/components/ui/Button";
import {
  calcMultiplierBps,
  calcProfitOnWin,
  MIN_ROLL_UNDER,
  MAX_ROLL_UNDER,
} from "@/lib/multiplier";
import {
  formatPercentBps,
  formatMultiplierBps,
  formatEth,
} from "@/lib/format";

interface BetFormProps {
  rollUnder: number;
  setRollUnder: (v: number) => void;
  stakeEth: string;
  setStakeEth: (v: string) => void;
  balanceWei: bigint | undefined;
  maxBetWei: bigint | undefined;
  disabled: boolean;
}

export function BetForm({
  rollUnder,
  setRollUnder,
  stakeEth,
  setStakeEth,
  balanceWei,
  maxBetWei,
  disabled,
}: BetFormProps) {
  const mult = calcMultiplierBps(rollUnder);
  let stakeWei = 0n;
  try {
    stakeWei = stakeEth ? parseEther(stakeEth as `${number}`) : 0n;
  } catch {
    stakeWei = 0n;
  }
  const profit = stakeWei > 0n ? calcProfitOnWin(stakeWei, mult) : 0n;

  function half() {
    if (!stakeWei) return;
    setStakeEth(formatEth(stakeWei / 2n, 6));
  }
  function double() {
    if (!stakeWei) return;
    setStakeEth(formatEth(stakeWei * 2n, 6));
  }
  function setMax() {
    if (!maxBetWei) return;
    const cap = balanceWei && balanceWei < maxBetWei ? balanceWei : maxBetWei;
    setStakeEth(formatEth(cap, 6));
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-8 space-y-8">
      {/* Win Chance */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-sans uppercase tracking-wider text-foreground-subtle">Win Chance</span>
          <span className="font-mono text-lg text-foreground">{formatPercentBps(rollUnder)}</span>
        </div>
        <Slider
          value={rollUnder}
          min={MIN_ROLL_UNDER}
          max={MAX_ROLL_UNDER}
          step={1}
          onChange={setRollUnder}
        />
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-sans uppercase tracking-wider text-foreground-subtle">Multiplier</span>
            <span className="font-mono text-lg text-primary">{formatMultiplierBps(mult)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-sans uppercase tracking-wider text-foreground-subtle">Roll Under</span>
            <span className="font-mono text-lg text-foreground-muted">{rollUnder}</span>
          </div>
        </div>
      </section>

      <div className="border-t border-border-subtle" />

      {/* Bet Amount */}
      <section className="space-y-3">
        <div className="text-xs font-sans uppercase tracking-wider text-foreground-subtle">Bet Amount</div>
        <Input
          value={stakeEth}
          onChange={(e) => setStakeEth(e.target.value)}
          placeholder="0.0010"
          suffix="ETH"
          inputMode="decimal"
        />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={half} disabled={!stakeWei}>½</Button>
          <Button variant="ghost" size="sm" onClick={double} disabled={!stakeWei}>2×</Button>
          <Button variant="ghost" size="sm" onClick={setMax} disabled={!maxBetWei}>Max</Button>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <span className="text-xs font-sans uppercase tracking-wider text-foreground-subtle">Profit on Win</span>
        <span className={`font-mono text-lg ${profit > 0n ? "text-primary" : "text-foreground-subtle"}`}>
          {profit > 0n ? `+${formatEth(profit)} ETH` : "—"}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/ui/Input.tsx components/ui/Slider.tsx components/dice/BetForm.tsx
git commit -m "feat(ui): input + slider atoms + BetForm component"
```

---

## Phase 5 — Dice game flow (Tasks 14-17)

### Task 14: BetButton with multi-state + useDicePhase + placeBet integration

**Files:**
- Create: `hooks/useDicePhase.ts`
- Create: `components/ui/PhasePill.tsx`
- Create: `components/dice/BetButton.tsx`

- [ ] **Step 1: useDicePhase hook**

`hooks/useDicePhase.ts`:

```ts
import { useCallback, useEffect, useState } from "react";
import { useAccount, useWaitForTransactionReceipt, useWatchContractEvent, useWriteContract } from "wagmi";
import { type Address, parseEther } from "viem";
import { useCasinoContract } from "./useCasinoContract";
import { calcMultiplierBps } from "@/lib/multiplier";

export type DicePhase =
  | { kind: "idle" }
  | { kind: "confirm" }
  | { kind: "broadcasting"; txHash: `0x${string}` }
  | { kind: "awaiting-vrf"; txHash: `0x${string}`; requestId?: bigint }
  | { kind: "won"; payout: bigint; result: number; requestId: bigint }
  | { kind: "lost"; result: number; requestId: bigint };

export function useDicePhase() {
  const { address } = useAccount();
  const contract = useCasinoContract();
  const [phase, setPhase] = useState<DicePhase>({ kind: "idle" });
  const { writeContractAsync, reset } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  });

  // listen for BetPlaced to capture requestId after tx mined
  useWatchContractEvent({
    ...contract,
    eventName: "BetPlaced",
    args: address ? { player: address } : undefined,
    onLogs(logs) {
      if (phase.kind !== "broadcasting" && phase.kind !== "awaiting-vrf") return;
      const log = logs[logs.length - 1];
      const requestId = log.args.requestId as bigint;
      setPhase({ kind: "awaiting-vrf", txHash: phase.kind === "broadcasting" ? phase.txHash : phase.txHash, requestId });
    },
  });

  useWatchContractEvent({
    ...contract,
    eventName: "BetSettled",
    args: address ? { player: address } : undefined,
    onLogs(logs) {
      if (phase.kind !== "awaiting-vrf") return;
      const log = logs[logs.length - 1];
      const won = log.args.won as boolean;
      const result = Number(log.args.result as bigint);
      const requestId = log.args.requestId as bigint;
      const payout = log.args.payout as bigint;
      if (phase.requestId && requestId !== phase.requestId) return;
      setPhase(won
        ? { kind: "won", payout, result, requestId }
        : { kind: "lost", result, requestId }
      );
      // auto-reset to idle after 4s so player sees the result
      setTimeout(() => {
        setPhase({ kind: "idle" });
        reset();
        setTxHash(undefined);
      }, 4000);
    },
  });

  const placeBet = useCallback(async (stakeEth: string, rollUnder: number) => {
    if (!address) throw new Error("not connected");
    const stake = parseEther(stakeEth as `${number}`);
    calcMultiplierBps(rollUnder); // throws if out of range
    setPhase({ kind: "confirm" });
    try {
      const hash = await writeContractAsync({
        ...contract,
        functionName: "placeBet",
        args: [stake, BigInt(rollUnder)],
      });
      setTxHash(hash);
      setPhase({ kind: "broadcasting", txHash: hash });
    } catch (err) {
      // user rejected or onchain revert
      setPhase({ kind: "idle" });
      throw err;
    }
  }, [address, contract, writeContractAsync]);

  return { phase, placeBet };
}
```

- [ ] **Step 2: PhasePill atom**

`components/ui/PhasePill.tsx`:

```tsx
import { cn } from "@/lib/cn";
import { type DicePhase } from "@/hooks/useDicePhase";
import { formatEth } from "@/lib/format";

const STYLES = {
  idle: "border-border text-foreground-muted bg-surface-overlay",
  active: "border-primary/40 text-primary bg-primary/5",
  pending: "border-warning/40 text-warning bg-warning/5",
  win: "border-primary text-primary bg-primary/10",
  loss: "border-danger/60 text-danger bg-danger/10",
} as const;

export function PhasePill({ phase }: { phase: DicePhase }) {
  let label = "Ready to roll";
  let dotClass = "bg-foreground-muted";
  let style = STYLES.idle;

  switch (phase.kind) {
    case "confirm":
      label = "Confirm in wallet…";
      dotClass = "bg-primary animate-pulse";
      style = STYLES.active;
      break;
    case "broadcasting":
      label = "Broadcasting transaction…";
      dotClass = "bg-primary animate-pulse";
      style = STYLES.active;
      break;
    case "awaiting-vrf":
      label = "Awaiting VRF · ≈30s";
      dotClass = "bg-warning animate-pulse";
      style = STYLES.pending;
      break;
    case "won":
      label = `WON +${formatEth(phase.payout)} ETH`;
      dotClass = "bg-primary";
      style = STYLES.win;
      break;
    case "lost":
      label = "House wins this roll";
      dotClass = "bg-danger";
      style = STYLES.loss;
      break;
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-4 h-9 rounded-md border text-sm font-mono",
        style
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", dotClass)} />
      {label}
    </div>
  );
}
```

- [ ] **Step 3: BetButton component**

`components/dice/BetButton.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/Button";
import { type DicePhase } from "@/hooks/useDicePhase";

interface BetButtonProps {
  phase: DicePhase;
  disabled: boolean;
  onClick: () => void;
}

export function BetButton({ phase, disabled, onClick }: BetButtonProps) {
  const isInFlight = phase.kind === "confirm" || phase.kind === "broadcasting" || phase.kind === "awaiting-vrf";

  let label = "ROLL DICE";
  if (phase.kind === "confirm") label = "CONFIRM IN WALLET";
  if (phase.kind === "broadcasting") label = "BROADCASTING…";
  if (phase.kind === "awaiting-vrf") label = "AWAITING RANDOMNESS";

  return (
    <Button
      size="xl"
      variant="primary"
      goldRim
      glow
      onClick={onClick}
      disabled={disabled || isInFlight}
      className="w-full font-bold uppercase tracking-wide"
    >
      {label}
    </Button>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add hooks/useDicePhase.ts components/ui/PhasePill.tsx components/dice/BetButton.tsx
git commit -m "feat(dice): bet lifecycle hook with phases + phase pill + bet button"
```

---

### Task 15: DiceCanvas with NumberFlipDisplay

**Files:**
- Create: `components/ui/NumberFlipDisplay.tsx`
- Create: `components/dice/DiceCanvas.tsx`

- [ ] **Step 1: NumberFlipDisplay**

`components/ui/NumberFlipDisplay.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

interface NumberFlipDisplayProps {
  value: number | null;        // null → idle "————"
  rolling: boolean;             // true → cycle digits
  tone?: "neutral" | "win" | "loss";
  className?: string;
}

export function NumberFlipDisplay({ value, rolling, tone = "neutral", className }: NumberFlipDisplayProps) {
  const [display, setDisplay] = useState<string>(value === null ? "————" : String(value).padStart(4, "0"));

  useEffect(() => {
    if (!rolling) {
      setDisplay(value === null ? "————" : String(value).padStart(4, "0"));
      return;
    }
    const id = setInterval(() => {
      setDisplay(Math.floor(Math.random() * 10000).toString().padStart(4, "0"));
    }, 50);
    return () => clearInterval(id);
  }, [rolling, value]);

  return (
    <span
      className={cn(
        "font-mono text-[8rem] md:text-[10rem] leading-none tracking-tighter tabular-nums select-none transition-colors duration-500",
        tone === "win" && "text-primary drop-shadow-[0_0_40px_rgba(212,175,55,0.55)]",
        tone === "loss" && "text-foreground",
        tone === "neutral" && "text-foreground",
        rolling && "text-foreground-muted",
        className
      )}
    >
      {display}
    </span>
  );
}
```

- [ ] **Step 2: DiceCanvas**

`components/dice/DiceCanvas.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { type DicePhase } from "@/hooks/useDicePhase";
import { NumberFlipDisplay } from "@/components/ui/NumberFlipDisplay";
import { PhasePill } from "@/components/ui/PhasePill";
import { cn } from "@/lib/cn";

interface DiceCanvasProps {
  phase: DicePhase;
  rollUnder: number;
}

export function DiceCanvas({ phase, rollUnder }: DiceCanvasProps) {
  const ref = useRef<HTMLDivElement>(null);
  const lastShownResult = useRef<number | null>(null);

  let value: number | null = null;
  let rolling = false;
  let tone: "neutral" | "win" | "loss" = "neutral";

  switch (phase.kind) {
    case "idle":
      value = null;
      break;
    case "confirm":
    case "broadcasting":
    case "awaiting-vrf":
      rolling = true;
      break;
    case "won":
      value = phase.result;
      tone = "win";
      break;
    case "lost":
      value = phase.result;
      tone = "loss";
      break;
  }

  // fire confetti once on win
  useEffect(() => {
    if (phase.kind === "won" && lastShownResult.current !== phase.result) {
      lastShownResult.current = phase.result;
      const rect = ref.current?.getBoundingClientRect();
      const origin = rect
        ? { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + 100) / window.innerHeight }
        : undefined;
      confetti({
        particleCount: 30,
        spread: 60,
        startVelocity: 35,
        gravity: 1.2,
        scalar: 0.8,
        colors: ["#D4AF37", "#E5C76B", "#C9A961"],
        origin,
      });
    }
    if (phase.kind === "idle") {
      lastShownResult.current = null;
    }
  }, [phase]);

  return (
    <div
      ref={ref}
      className={cn(
        "relative bg-surface border border-border rounded-xl shadow-[var(--shadow-gold-rim)] aspect-square flex flex-col items-center justify-center p-8 transition-all duration-700",
        tone === "loss" && "shadow-[0_0_60px_-8px_rgba(139,44,44,0.6)]"
      )}
    >
      <NumberFlipDisplay value={value} rolling={rolling} tone={tone} />
      <div className="mt-8 space-y-1 text-center font-mono">
        <div className="text-base text-foreground">
          Result · {value !== null ? String(value).padStart(4, "0") : "—"} / 9999
        </div>
        <div className="text-base text-foreground-muted">
          Win Under · {rollUnder}
        </div>
      </div>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <PhasePill phase={phase} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/NumberFlipDisplay.tsx components/dice/DiceCanvas.tsx
git commit -m "feat(dice): canvas with number flip + confetti on win + crimson glow on loss"
```

---

### Task 16: Dice page + Live Feed tab via event subscription

**Files:**
- Create: `app/dice/page.tsx`
- Create: `hooks/useBetEvents.ts`
- Create: `components/feed/LiveFeed.tsx`
- Create: `components/feed/FeedRow.tsx`
- Create: `components/ui/DataTable.tsx`
- Create: `components/ui/EtherscanLink.tsx`

- [ ] **Step 1: EtherscanLink atom**

`components/ui/EtherscanLink.tsx`:

```tsx
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  type: "tx" | "address" | "block";
  value: string | number | bigint;
  label?: string;
  className?: string;
}

const BASE = "https://sepolia.etherscan.io";

export function EtherscanLink({ type, value, label, className }: Props) {
  const v = typeof value === "bigint" ? value.toString() : String(value);
  const href =
    type === "tx" ? `${BASE}/tx/${v}` :
    type === "address" ? `${BASE}/address/${v}` :
    `${BASE}/block/${v}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 font-mono text-sm text-foreground hover:text-primary transition-colors",
        className
      )}
    >
      {label ?? v}
      <ExternalLink className="w-3.5 h-3.5 opacity-70" />
    </a>
  );
}
```

- [ ] **Step 2: DataTable atom**

`components/ui/DataTable.tsx`:

```tsx
import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  emptyState?: ReactNode;
  rowKey: (row: T) => string;
}

export function DataTable<T>({ columns, rows, emptyState, rowKey }: DataTableProps<T>) {
  if (rows.length === 0 && emptyState) {
    return <div className="py-12 text-center">{emptyState}</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border-subtle">
            {columns.map((c) => (
              <th key={c.key} className={cn(
                "text-left text-xs uppercase tracking-wider text-foreground-subtle font-sans font-normal py-3 px-4",
                c.className
              )}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-border-subtle/40 hover:bg-surface-elevated transition-colors">
              {columns.map((c) => (
                <td key={c.key} className={cn("py-3 px-4 text-sm", c.className)}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: useBetEvents hook**

`hooks/useBetEvents.ts`:

```ts
import { useEffect, useState } from "react";
import { useWatchContractEvent, usePublicClient } from "wagmi";
import { type Log } from "viem";
import { useCasinoContract } from "./useCasinoContract";

export interface BetEvent {
  requestId: bigint;
  player: `0x${string}`;
  stake: bigint;
  rollUnder: number;
  multiplierBps: number;
  result?: number;
  won?: boolean;
  payout?: bigint;
  settled: boolean;
  txHash: `0x${string}`;
  blockNumber: bigint;
  timestamp: number;
}

const MAX_FEED = 50;

export function useBetEvents() {
  const contract = useCasinoContract();
  const publicClient = usePublicClient();
  const [events, setEvents] = useState<BetEvent[]>([]);

  // initial load via getLogs
  useEffect(() => {
    if (!publicClient) return;
    let cancelled = false;
    (async () => {
      const placedLogs = await publicClient.getContractEvents({
        ...contract,
        eventName: "BetPlaced",
        fromBlock: "earliest",
        toBlock: "latest",
      });
      const settledLogs = await publicClient.getContractEvents({
        ...contract,
        eventName: "BetSettled",
        fromBlock: "earliest",
        toBlock: "latest",
      });

      const settledByReq = new Map<bigint, typeof settledLogs[number]>();
      for (const l of settledLogs) {
        settledByReq.set(l.args.requestId as bigint, l);
      }

      const blockTimestamps = new Map<bigint, number>();
      const uniqueBlocks = [...new Set(placedLogs.map((l) => l.blockNumber))];
      await Promise.all(uniqueBlocks.map(async (bn) => {
        if (!bn) return;
        const block = await publicClient.getBlock({ blockNumber: bn });
        blockTimestamps.set(bn, Number(block.timestamp));
      }));

      const merged: BetEvent[] = placedLogs.map((l) => {
        const requestId = l.args.requestId as bigint;
        const settled = settledByReq.get(requestId);
        return {
          requestId,
          player: l.args.player as `0x${string}`,
          stake: l.args.stake as bigint,
          rollUnder: Number(l.args.rollUnder as bigint),
          multiplierBps: Number(l.args.multiplierBps as bigint),
          result: settled ? Number(settled.args.result as bigint) : undefined,
          won: settled ? (settled.args.won as boolean) : undefined,
          payout: settled ? (settled.args.payout as bigint) : undefined,
          settled: !!settled,
          txHash: l.transactionHash,
          blockNumber: l.blockNumber!,
          timestamp: blockTimestamps.get(l.blockNumber!) ?? Date.now() / 1000,
        };
      });
      merged.sort((a, b) => Number(b.blockNumber - a.blockNumber));
      if (!cancelled) setEvents(merged.slice(0, MAX_FEED));
    })();
    return () => { cancelled = true; };
  }, [publicClient, contract]);

  // live subscribe to new events
  useWatchContractEvent({
    ...contract,
    eventName: "BetSettled",
    onLogs(logs) {
      setEvents((prev) => {
        const next = [...prev];
        for (const l of logs) {
          const requestId = l.args.requestId as bigint;
          const idx = next.findIndex((e) => e.requestId === requestId);
          if (idx >= 0) {
            next[idx] = {
              ...next[idx],
              result: Number(l.args.result as bigint),
              won: l.args.won as boolean,
              payout: l.args.payout as bigint,
              settled: true,
            };
          }
        }
        return next;
      });
    },
  });

  useWatchContractEvent({
    ...contract,
    eventName: "BetPlaced",
    onLogs(logs) {
      setEvents((prev) => {
        const additions: BetEvent[] = logs.map((l) => ({
          requestId: l.args.requestId as bigint,
          player: l.args.player as `0x${string}`,
          stake: l.args.stake as bigint,
          rollUnder: Number(l.args.rollUnder as bigint),
          multiplierBps: Number(l.args.multiplierBps as bigint),
          settled: false,
          txHash: l.transactionHash,
          blockNumber: l.blockNumber!,
          timestamp: Date.now() / 1000,
        }));
        return [...additions, ...prev].slice(0, MAX_FEED);
      });
    },
  });

  return events;
}
```

- [ ] **Step 4: FeedRow + LiveFeed components**

`components/feed/FeedRow.tsx`:

```tsx
import Link from "next/link";
import { Check, X, ExternalLink } from "lucide-react";
import { AddressChip } from "@/components/ui/AddressChip";
import { type BetEvent } from "@/hooks/useBetEvents";
import {
  formatEth,
  formatPercentBps,
  formatRelativeTime,
} from "@/lib/format";

interface FeedRowProps {
  event: BetEvent;
  showPlayer?: boolean;
}

export function feedColumns(showPlayer: boolean) {
  return [
    { key: "time", header: "Time", cell: (e: BetEvent) => <span className="text-foreground-muted">{formatRelativeTime(e.timestamp)}</span> },
    ...(showPlayer ? [{ key: "player", header: "Player", cell: (e: BetEvent) => <AddressChip address={e.player} showCopy={false} /> }] : []),
    { key: "chance", header: "Chance", cell: (e: BetEvent) => <span className="font-mono text-foreground">{formatPercentBps(e.rollUnder)}</span> },
    {
      key: "roll",
      header: "Roll",
      cell: (e: BetEvent) => {
        if (!e.settled) return <span className="font-mono text-warning">⏳</span>;
        return (
          <span className="inline-flex items-center gap-1.5 font-mono">
            {String(e.result).padStart(4, "0")}
            {e.won ? <Check className="w-3.5 h-3.5 text-primary" /> : <X className="w-3.5 h-3.5 text-danger" />}
          </span>
        );
      },
    },
    { key: "stake", header: "Stake", cell: (e: BetEvent) => <span className="font-mono text-foreground">{formatEth(e.stake)}</span> },
    {
      key: "payout",
      header: "Payout",
      cell: (e: BetEvent) => e.settled
        ? (e.won
            ? <span className="font-mono text-primary">+{formatEth(e.payout!)}</span>
            : <span className="font-mono text-foreground-subtle">—</span>)
        : <span className="font-mono text-foreground-subtle">…</span>,
    },
    {
      key: "verify",
      header: "Verify",
      cell: (e: BetEvent) => (
        <Link
          href={`/proof/${e.requestId.toString()}`}
          className="inline-flex items-center gap-1 text-foreground-muted hover:text-primary transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </Link>
      ),
    },
  ];
}
```

`components/feed/LiveFeed.tsx`:

```tsx
"use client";

import { DataTable } from "@/components/ui/DataTable";
import { useBetEvents } from "@/hooks/useBetEvents";
import { feedColumns } from "./FeedRow";

export function LiveFeed() {
  const events = useBetEvents();
  return (
    <DataTable
      columns={feedColumns(true)}
      rows={events}
      rowKey={(e) => e.requestId.toString()}
      emptyState={
        <div className="font-sans text-foreground-muted">
          No bets yet. Be the first to roll.
        </div>
      }
    />
  );
}
```

- [ ] **Step 5: Dice page**

`app/dice/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { TopBar } from "@/components/layout/TopBar";
import { BetForm } from "@/components/dice/BetForm";
import { BetButton } from "@/components/dice/BetButton";
import { DiceCanvas } from "@/components/dice/DiceCanvas";
import { LiveFeed } from "@/components/feed/LiveFeed";
import { useDicePhase } from "@/hooks/useDicePhase";
import { useCasinoBalance } from "@/hooks/useBalance";

export default function DicePage() {
  const { isConnected } = useAccount();
  const { data: balance } = useCasinoBalance();
  const { phase, placeBet } = useDicePhase();

  const [rollUnder, setRollUnder] = useState(4950);
  const [stake, setStake] = useState("0.0010");

  async function onRoll() {
    try {
      await placeBet(stake, rollUnder);
    } catch (e) {
      console.error(e);
    }
  }

  const disabled = !isConnected || !balance || balance === 0n;

  return (
    <>
      <TopBar />
      <main className="max-w-[1280px] mx-auto p-6 md:p-10 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-8">
          <DiceCanvas phase={phase} rollUnder={rollUnder} />
          <div className="space-y-6">
            <BetForm
              rollUnder={rollUnder}
              setRollUnder={setRollUnder}
              stakeEth={stake}
              setStakeEth={setStake}
              balanceWei={balance as bigint | undefined}
              maxBetWei={undefined /* wired in Task 18 */}
              disabled={disabled}
            />
            <BetButton phase={phase} disabled={disabled} onClick={onRoll} />
          </div>
        </div>
        <section className="space-y-4">
          <h2 className="text-xl font-display text-foreground">Live Feed</h2>
          <LiveFeed />
        </section>
      </main>
    </>
  );
}
```

- [ ] **Step 6: Smoke test in browser**

Run `pnpm dev`, navigate to http://localhost:3000/dice. With wallet connected on Sepolia:
1. Page should load with empty balance
2. Try to roll → button should be disabled (balance = 0)
3. After Task 18 wires deposit, full flow works

For now: confirm UI renders, no console errors. Stop dev server.

- [ ] **Step 7: Commit**

```bash
git add app/dice/page.tsx hooks/useBetEvents.ts components/feed/LiveFeed.tsx components/feed/FeedRow.tsx components/ui/DataTable.tsx components/ui/EtherscanLink.tsx
git commit -m "feat(dice): page layout + live feed via event subscription"
```

---

### Task 17: My Bets tab + tabs UI

**Files:**
- Create: `hooks/useMyBets.ts`
- Create: `components/feed/MyBets.tsx`
- Create: `components/ui/Tabs.tsx`
- Modify: `app/dice/page.tsx`

- [ ] **Step 1: Tabs atom**

`components/ui/Tabs.tsx`:

```tsx
"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Tab {
  key: string;
  label: ReactNode;
  content: ReactNode;
}

export function Tabs({ tabs, initialKey }: { tabs: Tab[]; initialKey?: string }) {
  const [active, setActive] = useState(initialKey ?? tabs[0]?.key);
  const current = tabs.find((t) => t.key === active);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 border-b border-border-subtle">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={cn(
              "px-4 py-3 text-sm font-sans transition-colors relative",
              active === t.key
                ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
                : "text-foreground-muted hover:text-primary"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>{current?.content}</div>
    </div>
  );
}
```

- [ ] **Step 2: useMyBets hook**

`hooks/useMyBets.ts`:

```ts
import { useEffect, useState } from "react";
import { useAccount, usePublicClient, useWatchContractEvent } from "wagmi";
import { useCasinoContract } from "./useCasinoContract";
import { type BetEvent } from "./useBetEvents";

export function useMyBets() {
  const { address } = useAccount();
  const contract = useCasinoContract();
  const publicClient = usePublicClient();
  const [events, setEvents] = useState<BetEvent[]>([]);

  useEffect(() => {
    if (!address || !publicClient) {
      setEvents([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const placed = await publicClient.getContractEvents({
        ...contract,
        eventName: "BetPlaced",
        args: { player: address },
        fromBlock: "earliest",
        toBlock: "latest",
      });
      const settled = await publicClient.getContractEvents({
        ...contract,
        eventName: "BetSettled",
        args: { player: address },
        fromBlock: "earliest",
        toBlock: "latest",
      });
      const settledByReq = new Map(settled.map((l) => [l.args.requestId as bigint, l]));
      const merged: BetEvent[] = placed.map((l) => {
        const requestId = l.args.requestId as bigint;
        const s = settledByReq.get(requestId);
        return {
          requestId,
          player: l.args.player as `0x${string}`,
          stake: l.args.stake as bigint,
          rollUnder: Number(l.args.rollUnder as bigint),
          multiplierBps: Number(l.args.multiplierBps as bigint),
          result: s ? Number(s.args.result as bigint) : undefined,
          won: s ? (s.args.won as boolean) : undefined,
          payout: s ? (s.args.payout as bigint) : undefined,
          settled: !!s,
          txHash: l.transactionHash,
          blockNumber: l.blockNumber!,
          timestamp: Date.now() / 1000, // for speed; can refine with block lookup if needed
        };
      });
      merged.sort((a, b) => Number(b.blockNumber - a.blockNumber));
      if (!cancelled) setEvents(merged);
    })();
    return () => { cancelled = true; };
  }, [address, publicClient, contract]);

  useWatchContractEvent({
    ...contract,
    eventName: "BetPlaced",
    args: address ? { player: address } : undefined,
    onLogs(logs) {
      setEvents((prev) => [
        ...logs.map((l) => ({
          requestId: l.args.requestId as bigint,
          player: l.args.player as `0x${string}`,
          stake: l.args.stake as bigint,
          rollUnder: Number(l.args.rollUnder as bigint),
          multiplierBps: Number(l.args.multiplierBps as bigint),
          settled: false,
          txHash: l.transactionHash,
          blockNumber: l.blockNumber!,
          timestamp: Date.now() / 1000,
        })),
        ...prev,
      ]);
    },
  });

  useWatchContractEvent({
    ...contract,
    eventName: "BetSettled",
    args: address ? { player: address } : undefined,
    onLogs(logs) {
      setEvents((prev) => {
        const next = [...prev];
        for (const l of logs) {
          const requestId = l.args.requestId as bigint;
          const idx = next.findIndex((e) => e.requestId === requestId);
          if (idx >= 0) {
            next[idx] = {
              ...next[idx],
              result: Number(l.args.result as bigint),
              won: l.args.won as boolean,
              payout: l.args.payout as bigint,
              settled: true,
            };
          }
        }
        return next;
      });
    },
  });

  return events;
}
```

- [ ] **Step 3: MyBets component**

`components/feed/MyBets.tsx`:

```tsx
"use client";

import { useAccount } from "wagmi";
import { DataTable } from "@/components/ui/DataTable";
import { feedColumns } from "./FeedRow";
import { useMyBets } from "@/hooks/useMyBets";

export function MyBets() {
  const { isConnected } = useAccount();
  const events = useMyBets();

  if (!isConnected) {
    return (
      <div className="py-12 text-center font-sans text-foreground-muted">
        Connect a wallet to see your bets.
      </div>
    );
  }
  return (
    <DataTable
      columns={feedColumns(false)}
      rows={events}
      rowKey={(e) => e.requestId.toString()}
      emptyState={
        <div className="font-sans text-foreground-muted">
          Your bets will appear here. The chain remembers everything.
        </div>
      }
    />
  );
}
```

- [ ] **Step 4: Wire tabs into dice page**

Update `app/dice/page.tsx` to replace the single Live Feed section with tabs:

```tsx
// add imports
import { Tabs } from "@/components/ui/Tabs";
import { MyBets } from "@/components/feed/MyBets";

// replace the previous <section> with:
<section className="space-y-4">
  <Tabs
    tabs={[
      { key: "mine", label: "My Bets", content: <MyBets /> },
      { key: "live", label: "Live Feed", content: <LiveFeed /> },
    ]}
    initialKey="mine"
  />
</section>
```

- [ ] **Step 5: Commit**

```bash
git add hooks/useMyBets.ts components/feed/MyBets.tsx components/ui/Tabs.tsx app/dice/page.tsx
git commit -m "feat(dice): tabs with My Bets + Live Feed"
```

---

### Task 18: Deposit + Withdraw modals + balance dropdown + max-bet calc

**Files:**
- Create: `components/modals/Modal.tsx`
- Create: `components/modals/DepositModal.tsx`
- Create: `components/modals/WithdrawModal.tsx`
- Create: `components/wallet/BalanceDropdown.tsx`
- Create: `hooks/useHouseBankroll.ts`
- Modify: `components/layout/TopBar.tsx`
- Modify: `app/dice/page.tsx`

- [ ] **Step 1: Modal primitive**

`components/modals/Modal.tsx`:

```tsx
"use client";

import { type ReactNode, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, subtitle, children }: ModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full max-w-[440px] bg-surface-elevated rounded-lg shadow-[var(--shadow-card)] p-8",
          "animate-in fade-in slide-in-from-bottom-2 duration-200"
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-foreground-muted hover:text-primary transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-display text-foreground">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-foreground-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: useHouseBankroll hook (for max-bet calc)**

`hooks/useHouseBankroll.ts`:

```ts
import { useReadContract, useWatchContractEvent } from "wagmi";
import { useCasinoContract } from "./useCasinoContract";

export function useHouseBankroll() {
  const contract = useCasinoContract();
  const query = useReadContract({
    ...contract,
    functionName: "houseBankroll",
  });
  useWatchContractEvent({
    ...contract,
    eventName: "HouseBankrollChanged",
    onLogs: () => query.refetch(),
  });
  return query;
}
```

- [ ] **Step 3: DepositModal**

`components/modals/DepositModal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Modal } from "./Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useCasinoContract } from "@/hooks/useCasinoContract";

const PRESETS = ["0.01", "0.05", "0.1"];

export function DepositModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const contract = useCasinoContract();
  const [amount, setAmount] = useState("0.01");
  const [error, setError] = useState<string | null>(null);
  const { writeContractAsync, isPending } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const { isLoading: confirming } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  });

  async function onSubmit() {
    setError(null);
    let value: bigint;
    try {
      value = parseEther(amount as `${number}`);
    } catch {
      setError("Invalid amount");
      return;
    }
    try {
      const hash = await writeContractAsync({
        ...contract,
        functionName: "deposit",
        value,
      });
      setTxHash(hash);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Deposit ETH" subtitle="Your balance funds bets. Withdraw any time.">
      <div className="space-y-4">
        <Input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          suffix="ETH"
          inputMode="decimal"
        />
        <div className="flex items-center gap-2">
          {PRESETS.map((p) => (
            <Button key={p} variant="ghost" size="sm" onClick={() => setAmount(p)}>{p}</Button>
          ))}
        </div>
        {error && <div className="text-sm text-danger font-mono">{error}</div>}
        <Button
          variant="primary"
          size="lg"
          goldRim
          glow
          className="w-full uppercase font-bold"
          onClick={onSubmit}
          disabled={isPending || confirming}
        >
          {isPending ? "CONFIRM IN WALLET" : confirming ? "DEPOSITING…" : `DEPOSIT ${amount} ETH`}
        </Button>
        <p className="text-xs text-foreground-subtle">
          Need Sepolia ETH? Get some at{" "}
          <a href="https://sepoliafaucet.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">sepoliafaucet.com</a>.
        </p>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 4: WithdrawModal**

`components/modals/WithdrawModal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Modal } from "./Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useCasinoContract } from "@/hooks/useCasinoContract";
import { useCasinoBalance } from "@/hooks/useBalance";
import { formatEth } from "@/lib/format";

export function WithdrawModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const contract = useCasinoContract();
  const { data: balance } = useCasinoBalance();
  const [amount, setAmount] = useState("0.01");
  const [error, setError] = useState<string | null>(null);
  const { writeContractAsync, isPending } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const { isLoading: confirming } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  });

  async function onSubmit() {
    setError(null);
    let value: bigint;
    try {
      value = parseEther(amount as `${number}`);
    } catch {
      setError("Invalid amount");
      return;
    }
    if (balance !== undefined && value > (balance as bigint)) {
      setError("Exceeds balance");
      return;
    }
    try {
      const hash = await writeContractAsync({
        ...contract,
        functionName: "withdraw",
        args: [value],
      });
      setTxHash(hash);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function setMax() {
    if (balance !== undefined) setAmount(formatEth(balance as bigint, 6));
  }

  return (
    <Modal open={open} onClose={onClose} title="Withdraw ETH" subtitle={`Available · ${balance !== undefined ? formatEth(balance as bigint) : "—"} ETH`}>
      <div className="space-y-4">
        <Input value={amount} onChange={(e) => setAmount(e.target.value)} suffix="ETH" inputMode="decimal" />
        <Button variant="ghost" size="sm" onClick={setMax}>Max</Button>
        {error && <div className="text-sm text-danger font-mono">{error}</div>}
        <Button
          variant="primary"
          size="lg"
          goldRim
          glow
          className="w-full uppercase font-bold"
          onClick={onSubmit}
          disabled={isPending || confirming}
        >
          {isPending ? "CONFIRM IN WALLET" : confirming ? "WITHDRAWING…" : `WITHDRAW ${amount} ETH`}
        </Button>
        <p className="text-xs text-foreground-subtle">
          Funds return to your connected wallet in one transaction.
        </p>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 5: BalanceDropdown**

`components/wallet/BalanceDropdown.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useAccount } from "wagmi";
import { useCasinoBalance } from "@/hooks/useBalance";
import { formatEth } from "@/lib/format";
import { DepositModal } from "@/components/modals/DepositModal";
import { WithdrawModal } from "@/components/modals/WithdrawModal";

export function BalanceDropdown() {
  const { isConnected } = useAccount();
  const { data: balance } = useCasinoBalance();
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<"deposit" | "withdraw" | null>(null);

  if (!isConnected) return null;

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 px-3 h-9 rounded-md bg-surface-elevated border border-border hover:border-primary/40 transition-colors"
        >
          <span className="text-xs text-foreground-subtle uppercase tracking-wider">Balance</span>
          <span className="font-mono text-foreground">{balance !== undefined ? formatEth(balance as bigint) : "—"} ETH</span>
          <ChevronDown className="w-4 h-4 text-foreground-muted" />
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-surface-overlay border border-border rounded-md shadow-[var(--shadow-card)] overflow-hidden">
            <button className="w-full text-left px-4 py-3 text-sm hover:bg-surface-elevated text-foreground" onClick={() => { setModal("deposit"); setOpen(false); }}>Deposit</button>
            <button className="w-full text-left px-4 py-3 text-sm hover:bg-surface-elevated text-foreground border-t border-border-subtle" onClick={() => { setModal("withdraw"); setOpen(false); }}>Withdraw</button>
          </div>
        )}
      </div>
      <DepositModal open={modal === "deposit"} onClose={() => setModal(null)} />
      <WithdrawModal open={modal === "withdraw"} onClose={() => setModal(null)} />
    </>
  );
}
```

- [ ] **Step 6: Wire BalanceDropdown into TopBar**

Update `components/layout/TopBar.tsx` to include `<BalanceDropdown />` in the right cluster (before NetworkBadge).

```tsx
import { BalanceDropdown } from "@/components/wallet/BalanceDropdown";
// inside the right cluster <div>:
<BalanceDropdown />
<NetworkBadge />
<ConnectButton />
```

- [ ] **Step 7: Wire maxBet calc into dice page**

In `app/dice/page.tsx`, add house bankroll to compute `maxBetWei`:

```tsx
import { useHouseBankroll } from "@/hooks/useHouseBankroll";
import { calcMultiplierBps, MAX_BET_BPS_OF_BANKROLL } from "@/lib/multiplier";
// ...
const { data: bankroll } = useHouseBankroll();
// maxBet so that maxBankrollRisk <= 1% bankroll
// risk = (stake * mult - stake) → so maxStake = (1% bankroll * 10000) / (mult - 10000)
let maxBetWei: bigint | undefined;
if (bankroll && (bankroll as bigint) > 0n) {
  const mult = calcMultiplierBps(rollUnder);
  const cap = (bankroll as bigint) * BigInt(MAX_BET_BPS_OF_BANKROLL) / 10000n;
  maxBetWei = cap * 10000n / BigInt(mult - 10000);
}
```

And add `MAX_BET_BPS_OF_BANKROLL = 100` to `lib/multiplier.ts`.

Pass `maxBetWei` to `<BetForm />`.

- [ ] **Step 8: End-to-end smoke**

Run `pnpm dev`. With wallet connected on Sepolia:
1. Click Connect Wallet → connect MetaMask on Sepolia
2. Click Balance dropdown → Deposit → enter 0.01 ETH → sign tx
3. After confirmation, balance updates (via event subscription)
4. Set rollUnder, set stake → click ROLL DICE → sign tx
5. Watch phase pill transition: confirm → broadcasting → awaiting-vrf
6. After VRF callback (~30s), see win/loss state and confetti or crimson glow
7. Click Balance dropdown → Withdraw → sign tx
8. Confirm balance returns

If any step fails: check browser console + Sepolia Etherscan for tx state. Common issues:
- Wrong network: TopBar shows Wrong Network badge — switch to Sepolia
- Contract not set: `NEXT_PUBLIC_CASINO_CONTRACT` env missing
- VRF stalled >2min: check that contract was added as consumer on VRF subscription page

- [ ] **Step 9: Commit**

```bash
git add components/modals/ components/wallet/BalanceDropdown.tsx components/layout/TopBar.tsx hooks/useHouseBankroll.ts app/dice/page.tsx lib/multiplier.ts
git commit -m "feat(dice): deposit/withdraw modals + balance dropdown + max-bet enforcement"
```

---

## Phase 6 — Lobby + Proof + About (Tasks 19-21)

### Task 19: Lobby page with hero + stats + game tiles + live ticker

**Files:**
- Create: `components/lobby/HeroBlock.tsx`
- Create: `components/lobby/StatsBar.tsx`
- Create: `components/lobby/GameTile.tsx`
- Create: `components/lobby/LiveTicker.tsx`
- Create: `components/ui/StatCard.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: StatCard atom**

`components/ui/StatCard.tsx`:

```tsx
import { cn } from "@/lib/cn";
import { type ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  tone?: "neutral" | "primary";
}

export function StatCard({ label, value, tone = "neutral" }: StatCardProps) {
  return (
    <div className="text-center md:text-left space-y-2">
      <div className="text-xs uppercase tracking-wider text-foreground-subtle font-sans">{label}</div>
      <div className={cn(
        "font-mono text-3xl md:text-4xl tabular-nums",
        tone === "primary" ? "text-primary" : "text-foreground"
      )}>
        {value}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: HeroBlock**

`components/lobby/HeroBlock.tsx`:

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function HeroBlock() {
  return (
    <section className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6">
      <div className="text-xs uppercase tracking-[0.2em] text-foreground-subtle font-mono mb-6">
        On-chain · Chainlink VRF · Ethereum Sepolia
      </div>
      <h1 className="font-display tracking-tight text-6xl md:text-8xl leading-[1.05] text-foreground">
        Provably fair dice.
      </h1>
      <h1 className="font-display italic tracking-tight text-6xl md:text-8xl leading-[1.05] text-primary mt-2">
        No house secrets.
      </h1>
      <p className="mt-8 text-lg md:text-xl text-foreground-muted max-w-[560px]">
        Every roll is decided by Chainlink VRF and settled in a single transaction. Verify any outcome on Etherscan in under a minute.
      </p>
      <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
        <Link href="/dice">
          <Button variant="primary" size="xl" goldRim glow className="uppercase font-bold tracking-wide">
            Enter Casino →
          </Button>
        </Link>
        <Link href="/about">
          <Button variant="ghost" size="xl">
            How it works
          </Button>
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: StatsBar (live from contract events)**

`components/lobby/StatsBar.tsx`:

```tsx
"use client";

import { useMemo } from "react";
import { useBetEvents } from "@/hooks/useBetEvents";
import { StatCard } from "@/components/ui/StatCard";
import { formatEth } from "@/lib/format";

export function StatsBar() {
  const events = useBetEvents();
  const stats = useMemo(() => {
    let totalWagered = 0n;
    let biggestWin24h = 0n;
    const cutoff = Date.now() / 1000 - 86400;
    let settled = 0;
    for (const e of events) {
      totalWagered += e.stake;
      if (e.settled) {
        settled++;
        if (e.won && e.timestamp >= cutoff && (e.payout ?? 0n) > biggestWin24h) {
          biggestWin24h = e.payout ?? 0n;
        }
      }
    }
    return { totalWagered, biggestWin24h, settled };
  }, [events]);

  return (
    <section className="bg-surface border-y border-border-subtle py-12">
      <div className="max-w-[1280px] mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0 md:divide-x md:divide-border-subtle">
        <div className="md:px-8"><StatCard label="Total Wagered" value={`${formatEth(stats.totalWagered)} ETH`} /></div>
        <div className="md:px-8"><StatCard label="Bets Settled" value={stats.settled.toLocaleString()} /></div>
        <div className="md:px-8"><StatCard label="Biggest Win · 24h" value={`+${formatEth(stats.biggestWin24h)} ETH`} tone="primary" /></div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: GameTile**

`components/lobby/GameTile.tsx`:

```tsx
import Link from "next/link";
import { cn } from "@/lib/cn";

interface GameTileProps {
  name: string;
  description: string;
  href?: string;
  state: "live" | "soon";
}

export function GameTile({ name, description, href, state }: GameTileProps) {
  const content = (
    <div
      className={cn(
        "relative aspect-square bg-surface border border-border rounded-lg p-6 flex flex-col justify-between transition-all",
        state === "live"
          ? "shadow-[var(--shadow-gold-rim-strong)] hover:scale-[1.02] hover:shadow-[var(--shadow-glow-primary)] cursor-pointer"
          : "opacity-40 grayscale cursor-not-allowed",
      )}
    >
      <div className={cn(
        "absolute top-4 right-4 inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-mono",
        state === "live" ? "text-primary" : "text-foreground-subtle"
      )}>
        <span className={cn("w-1.5 h-1.5 rounded-full", state === "live" ? "bg-primary" : "bg-foreground-subtle")} />
        {state === "live" ? "Live" : "Soon"}
      </div>
      <div className="mt-auto">
        <div className="font-mono text-2xl uppercase tracking-wide text-foreground">{name}</div>
        <div className="mt-1 text-sm text-foreground-muted">{description}</div>
      </div>
    </div>
  );
  if (href && state === "live") {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
```

- [ ] **Step 5: LiveTicker (marquee)**

`components/lobby/LiveTicker.tsx`:

```tsx
"use client";

import { useBetEvents } from "@/hooks/useBetEvents";
import { AddressChip } from "@/components/ui/AddressChip";
import { formatEth, formatRelativeTime } from "@/lib/format";

export function LiveTicker() {
  const events = useBetEvents();
  const wins = events.filter((e) => e.won && e.payout && e.payout > 0n).slice(0, 20);

  if (wins.length === 0) return null;

  return (
    <section className="bg-surface border-y border-border-subtle py-6 overflow-hidden">
      <div className="flex items-center gap-12 animate-marquee whitespace-nowrap">
        {[...wins, ...wins].map((e, i) => (
          <span key={`${e.requestId.toString()}-${i}`} className="inline-flex items-center gap-3 text-sm">
            <AddressChip address={e.player} showCopy={false} />
            <span className="text-foreground-muted">won</span>
            <span className="font-mono text-primary">+{formatEth(e.payout!)} ETH</span>
            <span className="text-foreground-muted">on Dice</span>
            <span className="text-foreground-subtle font-mono">· {formatRelativeTime(e.timestamp)}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
```

Add to `globals.css`:

```css
@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.animate-marquee {
  animation: marquee 60s linear infinite;
}
.animate-marquee:hover {
  animation-play-state: paused;
}
```

- [ ] **Step 6: Lobby page**

`app/page.tsx`:

```tsx
import { TopBar } from "@/components/layout/TopBar";
import { HeroBlock } from "@/components/lobby/HeroBlock";
import { StatsBar } from "@/components/lobby/StatsBar";
import { GameTile } from "@/components/lobby/GameTile";
import { LiveTicker } from "@/components/lobby/LiveTicker";
import { EtherscanLink } from "@/components/ui/EtherscanLink";

const CONTRACT = process.env.NEXT_PUBLIC_CASINO_CONTRACT;

export default function Page() {
  return (
    <>
      <TopBar />
      <main>
        <HeroBlock />
        <StatsBar />
        <section className="max-w-[1280px] mx-auto px-6 py-24 space-y-10">
          <div className="space-y-2">
            <h2 className="text-4xl md:text-5xl font-display text-foreground">Games</h2>
            <p className="text-foreground-muted">One live. More coming.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <GameTile name="Dice" description="On-chain Chainlink VRF" href="/dice" state="live" />
            <GameTile name="Slots" description="Classic 3-reel" state="soon" />
            <GameTile name="Plinko" description="Physics-based" state="soon" />
            <GameTile name="Roulette" description="European" state="soon" />
            <GameTile name="Coin Flip" description="50/50 odds" state="soon" />
          </div>
        </section>
        <LiveTicker />
        <footer className="max-w-[1280px] mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-6 items-center border-t border-border-subtle">
          <div>
            <div className="font-mono uppercase tracking-widest text-primary text-sm">True&nbsp;Dice</div>
            <div className="text-xs text-foreground-muted mt-1">Provably fair, on-chain dice.</div>
          </div>
          <div className="text-center">
            <div className="text-xs uppercase tracking-wider text-foreground-subtle">Contract</div>
            {CONTRACT && (
              <EtherscanLink type="address" value={CONTRACT} label={CONTRACT} className="text-xs" />
            )}
          </div>
          <div className="flex md:justify-end items-center gap-4 text-sm">
            <a href="https://github.com/" target="_blank" rel="noopener noreferrer" className="text-foreground-muted hover:text-primary">GitHub ↗</a>
            <a href="/about" className="text-foreground-muted hover:text-primary">About ↗</a>
          </div>
        </footer>
      </main>
    </>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add components/lobby/ components/ui/StatCard.tsx app/page.tsx app/globals.css
git commit -m "feat(lobby): hero + stats bar + game tiles + live ticker"
```

---

### Task 20: Provably Fair page

**Files:**
- Create: `app/proof/[requestId]/page.tsx`
- Create: `components/proof/ProofStep.tsx`

- [ ] **Step 1: ProofStep**

`components/proof/ProofStep.tsx`:

```tsx
import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ProofStepProps {
  step: number;
  title: string;
  children: ReactNode;
}

export function ProofStep({ step, title, children }: ProofStepProps) {
  return (
    <section className="bg-surface border border-border rounded-lg p-8 space-y-4">
      <div className="text-xs uppercase tracking-wider text-foreground-subtle font-mono">
        Step {step} · {title}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function KV({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4", className)}>
      <span className="text-xs uppercase tracking-wider text-foreground-subtle font-sans">{label}</span>
      <span className="font-mono text-sm text-foreground text-right break-all">{value}</span>
    </div>
  );
}
```

- [ ] **Step 2: Proof page**

`app/proof/[requestId]/page.tsx`:

```tsx
"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { usePublicClient } from "wagmi";
import { TopBar } from "@/components/layout/TopBar";
import { ProofStep, KV } from "@/components/proof/ProofStep";
import { EtherscanLink } from "@/components/ui/EtherscanLink";
import { AddressChip } from "@/components/ui/AddressChip";
import { Button } from "@/components/ui/Button";
import { useCasinoContract } from "@/hooks/useCasinoContract";
import { formatEth, formatPercentBps, formatMultiplierBps } from "@/lib/format";

interface ProofData {
  player: `0x${string}`;
  stake: bigint;
  rollUnder: number;
  multiplierBps: number;
  result?: number;
  won?: boolean;
  payout?: bigint;
  placedTx: `0x${string}`;
  placedBlock: bigint;
  settledTx?: `0x${string}`;
  settledBlock?: bigint;
}

export default function ProofPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = use(params);
  const publicClient = usePublicClient();
  const contract = useCasinoContract();
  const [data, setData] = useState<ProofData | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!publicClient || !requestId) return;
    const reqId = BigInt(requestId);
    (async () => {
      const placed = await publicClient.getContractEvents({
        ...contract,
        eventName: "BetPlaced",
        args: { requestId: reqId },
        fromBlock: "earliest",
        toBlock: "latest",
      });
      if (placed.length === 0) {
        setNotFound(true);
        return;
      }
      const p = placed[0];
      const settled = await publicClient.getContractEvents({
        ...contract,
        eventName: "BetSettled",
        args: { requestId: reqId },
        fromBlock: "earliest",
        toBlock: "latest",
      });
      const s = settled[0];
      setData({
        player: p.args.player as `0x${string}`,
        stake: p.args.stake as bigint,
        rollUnder: Number(p.args.rollUnder as bigint),
        multiplierBps: Number(p.args.multiplierBps as bigint),
        result: s ? Number(s.args.result as bigint) : undefined,
        won: s ? (s.args.won as boolean) : undefined,
        payout: s ? (s.args.payout as bigint) : undefined,
        placedTx: p.transactionHash,
        placedBlock: p.blockNumber!,
        settledTx: s?.transactionHash,
        settledBlock: s?.blockNumber,
      });
    })();
  }, [publicClient, contract, requestId]);

  return (
    <>
      <TopBar />
      <main className="max-w-[800px] mx-auto px-6 py-12">
        {notFound ? (
          <div className="text-center py-24">
            <h1 className="text-4xl font-display text-foreground">Roll not found.</h1>
            <Link href="/dice"><Button variant="primary" size="lg" className="mt-6">Back to dice</Button></Link>
          </div>
        ) : !data ? (
          <div className="text-foreground-muted">Loading…</div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-8">
              <div>
                <h1 className="text-3xl font-display text-foreground">Provably Fair Verification</h1>
                <p className="font-mono text-foreground-muted mt-1">Roll #{requestId.slice(0, 12)}…</p>
              </div>
              <EtherscanLink type="tx" value={data.placedTx} label="Open on Etherscan" className="border border-primary/40 text-primary px-3 h-9 rounded-md flex items-center" />
            </div>

            <div className="space-y-6">
              <ProofStep step={1} title="Bet Placed">
                <KV label="Player" value={<AddressChip address={data.player} />} />
                <KV label="Stake" value={`${formatEth(data.stake)} ETH`} />
                <KV label="Roll Under" value={`${data.rollUnder} (${formatPercentBps(data.rollUnder)})`} />
                <KV label="Multiplier" value={formatMultiplierBps(data.multiplierBps)} />
                <div className="pt-3 border-t border-border-subtle flex items-center gap-4">
                  <EtherscanLink type="tx" value={data.placedTx} label="Transaction" />
                  <EtherscanLink type="block" value={data.placedBlock} label={`Block ${data.placedBlock}`} />
                </div>
              </ProofStep>

              <ProofStep step={2} title="Chainlink VRF Request">
                <p className="text-sm text-foreground-muted">
                  Contract called <code className="font-mono text-foreground">requestRandomWords()</code> on VRFCoordinatorV2_5. The request now awaits verifiable randomness.
                </p>
                <KV label="Request ID" value={requestId} />
                <KV label="Confirmations" value="3" />
              </ProofStep>

              <ProofStep step={3} title="VRF Fulfillment">
                {data.settledTx ? (
                  <>
                    <p className="text-sm text-foreground-muted">
                      Chainlink VRF oracle returned cryptographically verifiable randomness.
                    </p>
                    <div className="mt-2">
                      <div className="text-xs uppercase tracking-wider text-foreground-subtle font-sans mb-1">Result (random word mod 10000)</div>
                      <div className="font-mono text-foreground bg-surface-elevated p-3 rounded-md break-all">
                        {String(data.result).padStart(4, "0")}
                      </div>
                    </div>
                    <div className="pt-3 border-t border-border-subtle">
                      <EtherscanLink type="tx" value={data.settledTx} label="Fulfillment Tx" />
                    </div>
                  </>
                ) : (
                  <p className="text-warning font-mono text-sm">Awaiting VRF callback…</p>
                )}
              </ProofStep>

              <ProofStep step={4} title="Settlement">
                {data.settledTx ? (
                  <>
                    <p className="text-sm text-foreground-muted">Contract deterministically calculated the result and paid out.</p>
                    <pre className="bg-surface-elevated p-4 rounded-md text-sm font-mono text-foreground whitespace-pre overflow-x-auto">
{`result = randomWord % 10000
       = ${String(data.result).padStart(4, "0")}

${data.result} ${data.won ? "<" : "≥"} ${data.rollUnder} (rollUnder)
       → ${data.won ? "WIN ✓" : "LOSS ✗"}

payout = stake × multiplier
       = ${formatEth(data.stake)} × ${formatMultiplierBps(data.multiplierBps)}
       = ${formatEth(data.payout ?? 0n)} ETH`}
                    </pre>
                    <div className="mt-3 p-4 bg-surface-elevated rounded-md shadow-[var(--shadow-gold-rim)]">
                      <span className="text-xs uppercase tracking-wider text-foreground-subtle">Outcome</span>
                      <div className={`mt-1 font-mono text-2xl ${data.won ? "text-primary" : "text-foreground"}`}>
                        {data.won
                          ? `WON +${formatEth((data.payout ?? 0n) - data.stake)} ETH net`
                          : `LOST ${formatEth(data.stake)} ETH`}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-foreground-muted text-sm">Pending settlement.</p>
                )}
              </ProofStep>

              <p className="text-center italic font-display text-foreground-muted max-w-[640px] mx-auto mt-12">
                Anyone with the requestId and the public blockchain can derive this same result. We can't change it. We didn't generate it. That's the point.
              </p>
            </div>
          </>
        )}
      </main>
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/proof/ components/proof/ProofStep.tsx
git commit -m "feat(proof): provably fair page with 4-step breakdown"
```

---

### Task 21: About page

**Files:**
- Create: `app/about/page.tsx`

- [ ] **Step 1: About page**

```tsx
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { EtherscanLink } from "@/components/ui/EtherscanLink";

const CONTRACT = process.env.NEXT_PUBLIC_CASINO_CONTRACT;

export default function AboutPage() {
  return (
    <>
      <TopBar />
      <main className="max-w-[720px] mx-auto px-6 py-16 space-y-12 text-foreground-muted">
        <h1 className="text-5xl font-display text-foreground">How True Dice Works</h1>

        <section className="space-y-3">
          <h3 className="text-xl text-foreground font-sans font-semibold">The Game</h3>
          <p>
            You choose a <code className="font-mono text-foreground">Win Chance</code> between 2% and 98%. The contract rolls a number from 0 to 9999. If it lands below your threshold, you win.
            Higher win chance means lower payout multiplier — and vice versa.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl text-foreground font-sans font-semibold">The Math</h3>
          <p>
            Payout multiplier is computed as <code className="font-mono text-foreground">(10000 × 9900) / rollUnder</code>.
            The <code className="font-mono text-foreground">9900</code> bakes in a 1.00% house edge — the only edge we keep.
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>49.5% chance → 2.0000× multiplier</li>
            <li>9.9% chance → 10.000× multiplier</li>
            <li>2.0% chance → 49.500× multiplier</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl text-foreground font-sans font-semibold">The Proof</h3>
          <p>
            Randomness comes from <a href="https://docs.chain.link/vrf/v2-5" target="_blank" rel="noopener noreferrer" className="text-primary underline">Chainlink VRF v2.5</a> — a cryptographically verifiable oracle.
            Every roll has a public requestId you can use to trace stake → random word → result → payout on Etherscan.
          </p>
          <p>
            See an example: <Link href="/dice" className="text-primary underline">place a bet</Link>, then click the verify icon on any row in your bets table.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl text-foreground font-sans font-semibold">The Code</h3>
          <p>
            The contract is open source and verified on Etherscan:
          </p>
          {CONTRACT && (
            <EtherscanLink type="address" value={CONTRACT} label={CONTRACT} />
          )}
        </section>
      </main>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/about/
git commit -m "feat(about): how it works page"
```

---

## Phase 7 — Edge cases, error states, polish (Tasks 22-24)

### Task 22: Error states + 404 + global error boundary

**Files:**
- Create: `app/not-found.tsx`
- Create: `app/error.tsx`
- Create: `components/layout/NetworkBanner.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: 404 page**

`app/not-found.tsx`:

```tsx
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <>
      <TopBar />
      <main className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-6xl font-display text-foreground">Roll not found.</h1>
        <p className="mt-4 text-foreground-muted">The chain has no record of that path.</p>
        <Link href="/"><Button variant="primary" size="lg" goldRim glow className="mt-8 uppercase font-bold">Back to lobby</Button></Link>
      </main>
    </>
  );
}
```

- [ ] **Step 2: Global error boundary**

`app/error.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-background">
      <h1 className="text-5xl font-display text-foreground">Something broke.</h1>
      <p className="mt-4 text-foreground-muted">The chain didn't.</p>
      <Button variant="primary" size="lg" goldRim glow onClick={reset} className="mt-8 uppercase font-bold">Refresh</Button>
    </main>
  );
}
```

- [ ] **Step 3: NetworkBanner — banner shown when wrong network**

`components/layout/NetworkBanner.tsx`:

```tsx
"use client";

import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { Button } from "@/components/ui/Button";

export function NetworkBanner() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected || chainId === sepolia.id) return null;

  return (
    <div className="bg-danger/10 border-b border-danger/40 text-danger px-6 py-3 flex items-center justify-center gap-4 text-sm">
      <span>This app runs on Sepolia. You're on chain {chainId}.</span>
      <Button
        variant="danger"
        size="sm"
        onClick={() => switchChain({ chainId: sepolia.id })}
        disabled={isPending}
      >
        {isPending ? "Switching…" : "Switch to Sepolia"}
      </Button>
    </div>
  );
}
```

Add it to `app/layout.tsx` body, above the `<Providers>` content but it needs wagmi context. Re-structure layout:

```tsx
// app/layout.tsx
import { Providers } from "./providers";
import { NetworkBanner } from "@/components/layout/NetworkBanner";
import "./globals.css";

// ...

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <Providers>
          <NetworkBanner />
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: VRF stalled toast (in dice page)**

Add to `app/dice/page.tsx`:

```tsx
import { useEffect, useState } from "react";

// inside DicePage, after const { phase, placeBet } = useDicePhase();
const [vrfWarning, setVrfWarning] = useState(false);
useEffect(() => {
  if (phase.kind !== "awaiting-vrf") {
    setVrfWarning(false);
    return;
  }
  const id = setTimeout(() => setVrfWarning(true), 120_000);
  return () => clearTimeout(id);
}, [phase]);

// render below the dice grid:
{vrfWarning && (
  <div className="fixed bottom-6 right-6 max-w-sm bg-surface-elevated border border-warning/40 rounded-lg p-4 shadow-[var(--shadow-card)] text-sm">
    <div className="font-mono text-warning uppercase tracking-wider text-xs mb-2">VRF taking longer than usual</div>
    <p className="text-foreground-muted">Your stake is safe. If this persists, check Etherscan or wait 24h to use <code className="text-foreground">rescueStaleBet</code>.</p>
  </div>
)}
```

- [ ] **Step 5: Insufficient bankroll guard in BetForm**

In `components/dice/BetForm.tsx`, add helper text below input when stake > maxBetWei:

```tsx
{stakeWei > 0n && maxBetWei && stakeWei > maxBetWei && (
  <p className="text-xs text-warning font-mono">
    Bet exceeds 1% of casino bankroll. Reduce bet or wait for next roll.
  </p>
)}
```

And pass `disabled={true}` for BetButton when stakeWei > maxBetWei in dice/page.

- [ ] **Step 6: Verify all states by clicking through**

Run `pnpm dev` and walk through every state:
- Disconnect wallet → /dice should show "Connect Wallet to see your bets" empty
- Switch to mainnet in MetaMask → NetworkBanner appears
- Switch back to Sepolia → banner disappears
- Try /proof/9999999999 (nonsense id) → "Roll not found" UI
- Navigate to /random-path → 404 page
- Throw an error in code temporarily → ErrorBoundary catches

Restore any test changes.

- [ ] **Step 7: Commit**

```bash
git add app/not-found.tsx app/error.tsx components/layout/NetworkBanner.tsx app/layout.tsx app/dice/page.tsx components/dice/BetForm.tsx
git commit -m "feat(ui): error states + 404 + network banner + VRF stall toast"
```

---

### Task 23: Stretch — Auto-bet (CONDITIONAL: only if ≥ 4 hours buffer remaining)

> Skip this task if you have < 4 hours until Phase 8.

**Files:**
- Modify: `components/dice/BetForm.tsx`
- Modify: `app/dice/page.tsx`

- [ ] **Step 1: Add Auto-bet state to dice page**

```tsx
const [autoBet, setAutoBet] = useState(false);
const [maxBets, setMaxBets] = useState(10);
const [betsRun, setBetsRun] = useState(0);
const [stopOnLoss, setStopOnLoss] = useState<string>("");
const [stopOnWin, setStopOnWin] = useState<string>("");

// after onRoll defined, add autoRun effect
useEffect(() => {
  if (!autoBet) return;
  if (phase.kind !== "idle") return;
  if (betsRun >= maxBets) {
    setAutoBet(false);
    return;
  }
  if (stopOnLoss && balance && (balance as bigint) <= parseEther(stopOnLoss as `${number}`)) {
    setAutoBet(false);
    return;
  }
  if (stopOnWin && balance && (balance as bigint) >= parseEther(stopOnWin as `${number}`)) {
    setAutoBet(false);
    return;
  }
  const t = setTimeout(() => {
    setBetsRun((n) => n + 1);
    onRoll();
  }, 1500);
  return () => clearTimeout(t);
}, [autoBet, phase, betsRun, maxBets, balance, stopOnLoss, stopOnWin]);
```

- [ ] **Step 2: Auto-bet UI in BetForm**

Add a toggle + max-bets input + stop-on-win/loss inputs below the existing form. Implementation details intentionally minimal — this is stretch.

- [ ] **Step 3: Commit**

```bash
git add app/dice/page.tsx components/dice/BetForm.tsx
git commit -m "feat(dice): stretch — auto-bet mode with stop-on-win/loss"
```

---

## Phase 8 — Deploy + deliverables (Tasks 24-27)

### Task 24: README finalization

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README**

```markdown
# True Dice — On-chain provably fair dice casino

> Verifiable on-chain casino built on Ethereum Sepolia for the [Vibe-Code 48h Challenge](#).
> Every roll is decided by Chainlink VRF v2.5 and settled in a single transaction.

**Live:** https://true-dice.vercel.app
**Contract:** [0x... on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x...)

## What works

- Wallet connect via RainbowKit (MetaMask, WalletConnect, Coinbase)
- Deposit / withdraw test ETH against an internal balance
- Place dice bet with configurable win-chance (2%–98%)
- Randomness from Chainlink VRF v2.5 — `request → fulfillment → settle` flow visible on-chain
- Live feed of all bets via event subscription
- Per-address bet history
- `/proof/[requestId]` page with full breakdown + Etherscan links
- 1% house edge baked into the multiplier formula
- 24h stale-bet rescue function as VRF outage fallback
- Network mismatch banner with one-click switch to Sepolia
- 404 + global error boundary

## What doesn't (and why)

- **No mainnet deploy** — contest is testnet-only by rules
- **No mobile-deep-link WalletConnect** — desktop-focused for time budget
- **No i18n** — en-only
- **No backend / DB** — all state on-chain
- **No /profile/[address] route** — stats live in `/dice` "My Bets" tab
- **No commit-reveal RNG fallback** — relying solely on `rescueStaleBet(requestId)` (24h timeout) was a deliberate choice to keep contract surface minimal in 48h

## Why Ethereum (and not Solana)

I considered Solana Devnet seriously. For a real-money casino product, lightning blocks + sub-cent fees make Solana attractive. I went with Ethereum Sepolia anyway because:

1. **48-hour Rust learning curve risk** — Anchor + IDL + cargo-build-sbf can eat hours on unfamiliar tooling errors. EVM is well-trodden ground.
2. **Casino reference contracts are far more abundant on EVM.** I needed patterns for VRF integration to ship fast.
3. **Solana's network outage history** would be a real concern for a real-money casino product.

For a mainnet ship I'd seriously look at Base L2 — same EVM tooling but with 2s blocks and ~$0.001 fees. Sepolia's 12s blocks are workable on testnet because the wait becomes a trust-signal UI element ("we wait because Chainlink VRF is real").

## Hardest unknown I figured out

**Chainlink VRF v2.5 vs v2 on Sepolia.** Most public tutorials and examples are still on VRF v2, but v2.5 is the current production version with different coordinator, key hash, and consumer-contract APIs (`VRFConsumerBaseV2Plus`, `RandomWordsRequest` struct with `extraArgs`). I burned ~2 hours debugging a "request not paid" error before realizing my consumer contract was importing v2 interfaces against a v2.5 coordinator. Solution: pin everything to v2.5 — both the brownie contracts package version (`chainlink-brownie-contracts@1.3.0`) and the Sepolia coordinator address (`0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B`).

## What I'd build next

1. **Multiple games** — Plinko and Slots both deserve their own VRF wiring. Slots is paytable-heavy; Plinko is animation-heavy. Either fits the existing event/feed infrastructure with minimal contract changes.
2. **Bankroll auto-funding mechanism** — owner-only top-up is fine for MVP, but a real casino needs treasury management (rebalancing, withdrawing only profits).
3. **Auto-bet with martingale / Fibonacci strategies** — UI surface for "play 100 rolls, double on loss" with proper stop-loss.
4. **L2 deploy (Base)** — port the contract unchanged; the only changes are RPC + chainId + VRF coordinator address. 80% UX improvement.
5. **Subgraph** for historical aggregates — high rollers, win rate leaderboards, ROI charts.
6. **NFT-gated VIP tier** — own an ERC-721, get a reduced house edge.

## How I used AI tools

(fill in honestly after the build, e.g.:)

- **Claude (Anthropic)** for TASK.md / DESIGN.md authoring, full contract scaffold, plan-driven implementation in the editor.
- **Cursor** as the primary editor with model context across files.
- **GitHub Copilot** for autocomplete on tedious boilerplate (event subscription handlers).
- **Claude Design** for visual generation of the lobby and proof pages.
- **What didn't work:** trying to one-shot the entire bet lifecycle hook — the resulting code missed re-entrancy edge cases. Splitting into smaller, test-anchored prompts produced better results.

## Local development

```bash
# install
pnpm install

# env
cp .env.example .env
# fill in: SEPOLIA_RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY, VRF_SUBSCRIPTION_ID, NEXT_PUBLIC_*

# contracts
pnpm contracts:test           # foundry tests
pnpm contracts:deploy         # broadcast + verify

# frontend
pnpm dev                      # http://localhost:3000
pnpm test                     # vitest unit tests
pnpm typecheck
```

## Stack

- **Contracts:** Solidity 0.8.24, Foundry, OpenZeppelin v5, Chainlink VRF v2.5
- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind v4, wagmi v2, viem, RainbowKit, shadcn/ui
- **Hosting:** Vercel (frontend), Sepolia (contract)
- **RPC:** Alchemy (HTTPS + WebSocket for event subscription)

## Repo layout

See [TASK.md](TASK.md) for the full technical spec and [DESIGN.md](DESIGN.md) for the visual system.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: comprehensive README with what works, what doesn't, and AI tooling debrief"
```

---

### Task 25: Deploy to Vercel + production smoke

- [ ] **Step 1: Push repo to GitHub**

```bash
git remote add origin git@github.com:YOUR_USER/vibecode-web3-casino.git
git push -u origin main
```

- [ ] **Step 2: Connect to Vercel**

Go to https://vercel.com/new → import your repo → use defaults.

Add environment variables in Vercel project settings (Production scope):
- `NEXT_PUBLIC_CHAIN_ID=11155111`
- `NEXT_PUBLIC_ALCHEMY_KEY=<your_key>`
- `NEXT_PUBLIC_ALCHEMY_WSS=<your_wss_url>`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<your_id>`
- `NEXT_PUBLIC_CASINO_CONTRACT=<deployed_address>`

Trigger deploy.

- [ ] **Step 3: Production smoke**

Open the live URL. Walk through:
1. Connect MetaMask (real Sepolia)
2. Deposit 0.005 ETH
3. Place a bet (low win chance, 9.9% for a memorable multiplier)
4. Wait for VRF → confirm result + verify on Etherscan
5. Click verify on the row → /proof/{requestId} loads and shows the full breakdown
6. Withdraw

If anything fails: check Vercel build logs and Sepolia tx receipt.

- [ ] **Step 4: Commit env reference for future deploys**

If you added a `vercel.json` or similar, commit it.

---

### Task 26: Loom recording

- [ ] **Step 1: Prepare recording script**

5-minute structure:
1. **0:00–0:30** — open lobby live URL, narrate the value prop ("provably fair, every roll on Etherscan")
2. **0:30–1:00** — connect a fresh wallet on Sepolia
3. **1:00–1:30** — deposit 0.005 ETH; show tx on Etherscan
4. **1:30–2:30** — place a bet with 9.9% win chance; narrate the multi-state button while Chainlink VRF runs; show the result
5. **2:30–3:30** — click verify → walk through `/proof/[requestId]` step-by-step; click an Etherscan link to show the actual log
6. **3:30–4:00** — withdraw; show final tx
7. **4:00–5:00** — the "one thing I didn't know": Chainlink VRF v2.5 vs v2 confusion + how I figured it out (see README section)

- [ ] **Step 2: Record + upload to Loom**

Use Loom's 5-min free tier. Record at 1080p. Keep camera on for the narrative section.

- [ ] **Step 3: Copy share link**

Note the public URL for Notion.

---

### Task 27: Notion submission page + Telegram send

- [ ] **Step 1: Create Notion page**

Page title: `True Dice — Web3 Casino · Vibe-Code Submission`

Content blocks:
- **GitHub:** repo URL (public)
- **Live URL:** Vercel domain
- **Contract:** Etherscan link to verified contract
- **Loom (5 min):** link to recording
- **README highlights** (bullet copy from README's "What works")
- **AI tooling debrief** (paste from README)

- [ ] **Step 2: Send to Telegram**

Open Telegram, send the Notion page URL to `@ryazhenkacustomers`.

- [ ] **Step 3: Verify time buffer**

Confirm submission timestamp is before `01.06.2026 06:00 GMT+3`.

---

## Self-Review (post-plan)

**Spec coverage check** (against TASK.md):

| TASK.md section | Plan task(s) covering it |
|---|---|
| §0 TL;DR | Whole plan |
| §1 Контекст / Deliverables | Tasks 24-27 |
| §2 Решения (Ethereum, Dice, VRF v2.5, stack) | Tasks 1-2 setup + 4 |
| §3 Архитектура | Tasks 1-2 (monorepo), 9 (providers) |
| §4 Smart Contract Specification | Tasks 3-7 |
| §5 Frontend (routes + scenarios + states) | Tasks 8-22 |
| §6 Дизайн (palette via DESIGN.md) | Task 8 |
| §7 Конфиг (.env + repo structure) | Tasks 1, 7 |
| §8 Риски (rescueStaleBet, multi-RPC, dev velocity) | Tasks 5 (rescue test), 9 (RPC), 22 (network banner) |
| §9 Таймлайн | Plan phases match — Phase 1-2 ≈ TASK §9 Phase 1, Phase 3-7 ≈ §9 Phase 2, Phase 8 ≈ §9 Phase 3 |
| §10 Pre-flight | Plan "Pre-Flight" section before Task 1 |
| §11 DoD | Tasks 24-27 final deliverables |

**Placeholder scan:** No "TBD" / "implement later" / "similar to Task N". Stretch task is explicitly marked CONDITIONAL with a guard rule.

**Type consistency:**
- `DicePhase` types in `useDicePhase.ts` are referenced in `PhasePill.tsx`, `BetButton.tsx`, `DiceCanvas.tsx` with the same field names (`payout`, `result`, `requestId`).
- `BetEvent` shape is consistent between `useBetEvents.ts`, `useMyBets.ts`, `FeedRow.tsx`.
- `CasinoDiceAbi` is exported as `as const` and consumed via `useCasinoContract`.
- `MAX_BET_BPS_OF_BANKROLL` added to `lib/multiplier.ts` in Task 18 to match contract constant from Task 4.

**Ambiguity check:** Task 23 (auto-bet) is intentionally less specific because it's stretch. All other tasks have exact file paths + complete code blocks.

Plan complete and saved to `docs/superpowers/plans/2026-05-29-true-dice-casino.md`.
