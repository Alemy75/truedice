# TASK.md — True Dice (Vibe-Code Web3 Casino Challenge)

> Техническое задание на разработку on-chain казино для 48-часового конкурса.
> **Дедлайн:** 1 June 2026 06:00 GMT+3 · **Старт:** 30 May 2026 06:00 GMT+3
> **Submit:** Telegram @ryazhenkacustomers (Notion-страница)

---

## 0. TL;DR

**Что строим:** `True Dice` — provably-fair on-chain dice-казино на **Ethereum Sepolia (L1)** с источником случайности **Chainlink VRF v2.5**. Игрок подключает кошелёк, депозитит test ETH, играет в dice (выбирает шанс выигрыша слайдером 2–98%), выводит баланс обратно. Каждый ролл верифицируется на Etherscan параноидальным игроком в 3 клика.

**Стек:** Solidity 0.8.x + Foundry (контракты), Next.js 15 + React 19 + TypeScript + Tailwind v4 + wagmi v2 + viem + RainbowKit + shadcn/ui (фронт), Vercel (хостинг), Alchemy (RPC).

**Игра:** одна, Dice. Полирована до production-уровня; четыре остальных тайла в лобби помечены `SOON`.

**House edge:** 1.00%, встроен в формулу выплаты.

---

## 1. Контекст и ограничения конкурса

### Обязательные требования (из брифа)

1. Connect wallet (MetaMask / WalletConnect)
2. Deposit test tokens в казино
3. Play a game с win/loss механикой
4. Withdraw баланса обратно в кошелёк
5. Логика **verifiable on-chain** — параноик с block explorer должен убедиться, что это не скам
6. **Testnet only** (Sepolia L1)
7. Deploy на публичный URL (Vercel)
8. **House edge** обязателен — это казино, не благотворительность
9. UX, визуал, copy, error states — на уровне «релизим завтра»

### Deliverables к моменту сдачи

- [ ] Public GitHub repo (`vibecode-web3-casino`)
- [ ] Live URL на тестнете (Vercel domain)
- [ ] README: что работает / что нет / почему Ethereum (а не Solana) / hardest unknown / what would build next
- [ ] 5-минутный Loom: flow + одна вещь, которую не знал
- [ ] Bonus: секция «AI tooling» в README — что сработало, что нет
- [ ] Notion-страница со всеми ссылками, отправленная в Telegram

---

## 2. Решения по технологии и обоснование

### Выбор сети: **Ethereum Sepolia (L1)**

**Что рассматривали:**
- ✅ Ethereum Sepolia (L1) — выбрано
- ❌ Solana Devnet — отброшено: Rust/Anchor learning curve в 48ч, история network outages, меньше готовых reference-контрактов для casino + VRF
- ❌ Base Sepolia / Arbitrum Sepolia (L2) — отброшено: формулировка правил «Ethereum testnet (Sepolia / Holesky, etc.)» явно перечисляет только L1; L2 — зона ambiguity, риск дисквалификации не оправдан

**Если бы это был mainnet продукт** — рекомендовали бы Base L2 (быстрые блоки + дешёвый газ + EVM tooling), но для оценочного конкурса важнее строгое соответствие правилам.

**Митигация минусов Sepolia:**
- 12-секундные блоки + VRF callback задержка = ~24-30с от Roll до результата
- Решение в UI: explicit progress-bar «Waiting for Chainlink VRF» + tooltip «This proves it's not rigged» — превращаем задержку в trust-сигнал, а не фрустрацию

### Выбор игры: **Dice** (BC.Game / Stake.com стиль)

**Что рассматривали:**
- ✅ Dice — выбрано (одно VRF на бет, простой контракт, глубина из winChance-слайдера)
- ❌ Coin Flip — слишком плоский, проигрывает по «глубине продукта»
- ❌ Slots — paytable + анимация катушек съест день только на UI
- ❌ Plinko — canvas/physics с peg-tree рискует развалиться
- ❌ Roulette / Mines / Blackjack — слишком сложный контракт или multi-step VRF

**Расширение глубины** при простом ядре:
- Lobby с placeholders «Coming Soon» (Slots / Plinko / Roulette / Coin Flip)
- Live wins ticker — стрим из event log
- Stats bar (total wagered, biggest win 24h)
- Provably Fair страница `/proof/[requestId]`
- Player stats + history через `My Bets` таб
- Auto-bet (stretch, если останется время)

### Выбор RNG: **Chainlink VRF v2.5**

- Industry-standard, аудирован, native на Sepolia
- Verifiable proof on-chain (random word + proof доступны на Etherscan)
- Subscription model дешевле direct funding в долгую
- На случай VRF outage — функция `rescueStaleBet(requestId)` возвращает stake игроку через 24ч (без отдельной commit-reveal ветки — для 48ч лишняя сложность)

### Стек фронта

| Слой | Выбор | Почему |
|---|---|---|
| Framework | Next.js 15 (App Router) | React 19, лучший Vercel-deploy, SSR не нужен но не мешает |
| Стили | Tailwind v4 (CSS-first `@theme`) | Скорость, дизайн-токены первоклассно |
| UI kit | shadcn/ui (Radix + Tailwind) | Production-quality без borrowed look |
| Wallet | RainbowKit | Покрывает MetaMask + WalletConnect + Coinbase сразу |
| Web3 | wagmi v2 + viem | Type-safe, hooks-first, идиоматический React |
| Animation | framer-motion + canvas-confetti | Микро-интеракции + win-burst |
| Icons | lucide-react | Лёгкий, tree-shakeable |
| Fonts | Cormorant Garamond (display) + Geist Sans + Geist Mono | Serif на headings = luxury-сигнал; Geist для body/numbers — см. [DESIGN.md §4](DESIGN.md) |

---

## 3. Системная архитектура

```
┌────────────────────────────────────────────────────────────┐
│  Browser (Next.js 15 app on Vercel)                       │
│  ┌──────────────────────────────────────────────────┐    │
│  │ RainbowKit ── wagmi v2 ── viem                   │    │
│  │   ├─ Wallet connect (MetaMask, WC, Coinbase)     │    │
│  │   ├─ Read: balanceOf, lastRoll, recentRolls      │    │
│  │   └─ Write: deposit, placeBet, withdraw          │    │
│  └────────────────┬───────────────────────────┬─────┘    │
└───────────────────┼───────────────────────────┼──────────┘
                    │ JSON-RPC (Alchemy)        │ WebSocket subscribe
                    │                           │ (BetSettled events)
                    ▼                           │
┌────────────────────────────────────────────────────────────┐
│  Ethereum Sepolia L1                                       │
│                                                            │
│  ┌──────────────────────────┐                             │
│  │  CasinoDice.sol          │ ◀───── VRFCoordinatorV2_5   │
│  │  • internal balances     │        (Chainlink)          │
│  │  • placeBet → request    │                             │
│  │  • fulfillRandomWords ───┼──────▶ payout + event       │
│  │  • withdraw              │                             │
│  └──────────────────────────┘                             │
└────────────────────────────────────────────────────────────┘
```

### Ключевые архитектурные принципы

1. **Один монолитный контракт** `CasinoDice.sol` (~250 LOC). Хранит игровые балансы, банкролл казино, in-flight ставки. Наследует `VRFConsumerBaseV2Plus`, `ReentrancyGuard`, `Ownable`.

2. **No backend / no DB.** Все данные читаются прямо из чейна через `viem`. Live feed — WebSocket subscription на события через Alchemy. История игрока — `getLogs` с фильтром по `indexed player`.

3. **RPC: Alchemy Sepolia (free tier).** Резерв в `.env`: Infura + один public RPC из chainlist.org. wagmi сам failover'ит.

4. **Деплой:** Vercel для фронта; контракт деплоится через `forge script --broadcast --verify` (Etherscan-верификация в одну команду — критично для пункта «параноик с эксплорером»).

5. **Безопасность ключей:** Никаких private keys на фронте. Vercel env: только публичные адреса + Alchemy API key (rate-limit по домену). Deployer key — только в локальном `.env` Foundry, в `.gitignore`.

### Сознательные scope-cuts (YAGNI)

- ❌ Subgraph / The Graph
- ❌ Backend API / serverless functions
- ❌ ERC-20 chip-токен (играем за raw test ETH)
- ❌ Pausable / whitelist / KYC механики
- ❌ i18n (en-only)
- ❌ Mobile-deep-link WalletConnect (best effort, не оптимизируем)

---

## 4. Smart Contract Specification

### Файл: `contracts/CasinoDice.sol`

Соответствует Solidity ^0.8.24, OpenZeppelin v5, Chainlink VRF v2.5.

### Стейт

```solidity
mapping(address => uint256) public balanceOf;        // player → wei
uint256 public houseBankroll;                        // отделённый банкролл казино
mapping(uint256 => Roll) public rolls;               // VRF requestId → Roll

uint256[] public recentRollIds;                      // кольцевой буфер последних 50 роллов
uint256 public constant FEED_SIZE = 50;

struct Roll {
    address player;
    uint128 stake;          // wei
    uint64  rollUnder;      // порог 200..9800 (= 2%..98%)
    uint64  multiplierBps;  // payout multiplier, 1.00x = 10000
    uint64  result;         // 0..9999 (заполняется в fulfill)
    bool    won;
    bool    settled;
    uint40  requestedAt;    // block.timestamp
}

uint256 public constant HOUSE_EDGE_BPS = 100;          // 1.00%
uint256 public constant MIN_BET = 0.0001 ether;
uint256 public constant MAX_BET_BPS_OF_BANKROLL = 100; // 1% bankroll cap
uint256 public constant MIN_ROLL_UNDER = 200;          // 2%   → max ~49.5x
uint256 public constant MAX_ROLL_UNDER = 9800;         // 98%  → min ~1.0102x
uint256 public constant STALE_BET_TIMEOUT = 24 hours;
```

### Внешний API

```solidity
function deposit() external payable;
function withdraw(uint256 amount) external nonReentrant;
function placeBet(uint128 stake, uint64 rollUnder) external nonReentrant returns (uint256 requestId);
function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override;

function rescueStaleBet(uint256 requestId) external;          // фолбэк, любой может вызвать после 24ч
function depositHouseBankroll() external payable onlyOwner;
function withdrawHouseBankroll(uint256 amount) external onlyOwner;
function getRecentRolls(uint256 n) external view returns (Roll[] memory);
```

### Математика выплат

```
multiplierBps = (10000 * (10000 - HOUSE_EDGE_BPS)) / rollUnder
              = 99_000_000 / rollUnder

rollUnder = 4950 (49.50%)  → multiplier 2.0000×
rollUnder = 9800 (98.00%)  → multiplier 1.0102×
rollUnder =  200 ( 2.00%)  → multiplier 49.5000×
```

**Expected Value = -1%** ровно. House edge встроен математически.

### События

```solidity
event Deposited(address indexed player, uint256 amount, uint256 newBalance);
event Withdrawn(address indexed player, uint256 amount, uint256 newBalance);
event BetPlaced(uint256 indexed requestId, address indexed player, uint128 stake, uint64 rollUnder, uint64 multiplierBps);
event BetSettled(uint256 indexed requestId, address indexed player, uint64 result, bool won, uint256 payout);
event HouseBankrollChanged(int256 delta, uint256 newBankroll);
event BetRescued(uint256 indexed requestId, address indexed player, uint256 stakeReturned);
```

### Безопасность (3 must-have защиты)

1. **Checks-Effects-Interactions** в `placeBet` — `balanceOf` списывается ДО запроса VRF
2. **`MAX_BET_BPS_OF_BANKROLL = 1%`** — даже max-payout (49.5×) не разорит банкролл
3. **`rescueStaleBet(requestId)`** — после 24ч любой может вернуть зависшую ставку игроку (фолбэк на случай VRF outage)

### Тесты (Foundry, минимум 12)

- Unit: `test_DepositIncreasesBalance`, `test_WithdrawCannotExceedBalance`, `test_PlaceBet_RevertsBetTooSmall`, `test_PlaceBet_RevertsBetExceedsBankrollCap`, `test_PlaceBet_RevertsInvalidRollUnder`, `test_Fulfill_MarksWinPaysCorrectly`, `test_Fulfill_MarksLossKeepsStake`, `test_RescueStaleBet_OnlyAfterTimeout`, `test_OnlyOwnerCanModifyBankroll`
- Math: `test_PayoutMath` (соответствие формуле)
- Fuzz: `test_HouseEdgeConvergence` (1000 ролов → P&L банкролла ≈ 1% от total wagered ±3σ)
- Mock VRF: используем `VRFCoordinatorV2_5Mock` от Chainlink

**Целевое покрытие:** ≥ 90% (forge coverage)

---

## 5. Frontend Specification (функциональная часть)

> **Визуальная часть** (детальные layouts, палитра, типографика, компоненты, аниматика) — в отдельном файле [DESIGN.md](DESIGN.md). Этот раздел — только функциональное определение: какие маршруты, какие данные, какие состояния обрабатываем.

### Маршруты

| Маршрут | Назначение | Источник данных |
|---|---|---|
| `/` | Lobby: hero + stats strip + game grid (только Dice активен) + live wins ticker | Контракт-events для stats и ticker |
| `/dice` | Игровой экран — 90% продукта. Bet form + dice visual + tabs (My Bets / Live Feed / High Rollers) | `balanceOf`, `placeBet`, событие `BetSettled` (subscribe) |
| `/proof/[requestId]` | Provably Fair: пошаговый разбор одного ролла со ссылками на Etherscan | `getLogs` filtered by requestId |
| `/about` | Как работает (математика, VRF, ссылки на код) | Static |

`/profile/[address]` — **вырезан**. Stats игрока показываются на вкладке `My Bets` в `/dice`.

### Обязательные функциональные сценарии

- **Connect Wallet** (RainbowKit): MetaMask / WalletConnect / Coinbase Wallet
- **Deposit ETH** в контракт через модалку
- **Place Bet** с параметрами `(stake, rollUnder)` → tx с подписью → VRF callback → settlement
- **Watch BetSettled events** в реальном времени (WebSocket subscribe через Alchemy) для live feed
- **Withdraw ETH** на кошелёк через модалку
- **Network detection**: если сеть ≠ Sepolia → top banner с кнопкой `Switch`
- **Read player history** через `getLogs` filtered by `indexed player`
- **Verify roll**: переход на `/proof/[requestId]` из любой строки фида

### Required UI states (минимальный список)

Подробное оформление см. в [DESIGN.md §8.6](DESIGN.md). Сценарии, которые обязаны отрабатывать:

- Not connected (`/dice`)
- Connected, balance = 0 (автоопен Deposit)
- Wrong network (Sepolia mismatch)
- No bets yet (My Bets / Live Feed empty states)
- VRF stalled (>2 min) — toast + recovery hint
- Insufficient bankroll for bet size — disabled CTA + tooltip
- Tx rejected by user / Tx failed on-chain
- 404 + generic error boundary

### Компонентная карта (для скоупа)

```
components/
  wallet/        ConnectButton, BalanceDropdown, NetworkBadge
  dice/          DiceCanvas, BetForm, BetButton, RollResult, NumberFlipDisplay
  feed/          LiveFeed, MyBets, FeedRow
  proof/         ProofPage, ProofBadge, ProofStep
  modals/        DepositModal, WithdrawModal
  lobby/         GameTile, LiveTicker, StatsBar, HeroBlock
  ui/            (10 переиспользуемых atoms — см. DESIGN.md §9)
```

---

## 6. Дизайн

> Полная визуальная система — **gold + black luxury palette**, типографика (Cormorant Garamond display + Geist Sans/Mono), детальные layouts всех страниц, библиотека из 10 атомов и аниматика — вынесены в отдельный файл [DESIGN.md](DESIGN.md).
>
> DESIGN.md служит **single source of truth** для дизайна и одновременно готовым брифом для Claude Design / Figma Make — копируется целиком как первое сообщение в дизайн-инструмент.
>
> **Краткое summary палитры:**
> - Primary: `#D4AF37` metallic gold (signature accent, win states, главная CTA)
> - Background: `#050403` warm near-black
> - Foreground: `#F5EFE0` champagne off-white (НЕ pure white)
> - Display font: **Cormorant Garamond** (serif) для headings — ключевой luxury-сигнал
> - Mood reference: Casino de Monte-Carlo × Aston Martin × Stake.com VIP

---

## 7. Конфигурация окружения

### `.env.example` (commit'нуть в репо)

```bash
# === Foundry / Contract deployment ===
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<ALCHEMY_KEY>
PRIVATE_KEY=                         # deployer key, никогда в commit
ETHERSCAN_API_KEY=                   # для forge verify

# Chainlink VRF v2.5 (Sepolia)
VRF_COORDINATOR=0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B
VRF_KEY_HASH=0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae
VRF_SUBSCRIPTION_ID=                 # создать заранее на vrf.chain.link
VRF_CALLBACK_GAS_LIMIT=200000
VRF_REQUEST_CONFIRMATIONS=3

# === Next.js / Frontend ===
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_ALCHEMY_KEY=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_CASINO_CONTRACT=         # заполнить после deploy
```

### Структура репозитория

```
vibecode-web3-casino/
├── TASK.md                          # этот файл — функциональное ТЗ
├── DESIGN.md                        # дизайн-система + бриф для Claude Design
├── README.md                        # итоговый submit-doc
├── .env.example
├── .gitignore                       # .env, node_modules, foundry out/, cache/
│
├── contracts/                       # Foundry проект
│   ├── foundry.toml
│   ├── src/CasinoDice.sol
│   ├── test/CasinoDice.t.sol
│   ├── script/Deploy.s.sol
│   └── lib/                         # OZ, Chainlink (через forge install)
│
├── app/                             # Next.js App Router
│   ├── globals.css                  # Tailwind v4 + @theme
│   ├── layout.tsx
│   ├── page.tsx                     # Lobby
│   ├── dice/page.tsx
│   ├── proof/[requestId]/page.tsx
│   ├── about/page.tsx
│   └── providers.tsx                # wagmi + RainbowKit + React Query
│
├── components/                      # см. компонентную карту выше
├── hooks/                           # useCasinoContract, useBetEvents, useBalance
├── lib/                             # contract ABI, viem config, formatters
├── public/
│
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── next.config.ts
└── vercel.json
```

---

## 8. Риск-регистр

| # | Риск | P | Митигация |
|---|---|---|---|
| 1 | VRF subscription gas/LINK не работает | Med | Создать subscription за >6ч до старта, залить ≥5 LINK + 0.5 testnet ETH; деплоить контракт первым, добавить как consumer, прогнать e2e smoke на live Sepolia до начала фронта |
| 2 | VRF callback не приходит (Sepolia outage) | Med | `rescueStaleBet(requestId)` через 24ч возвращает stake; UI показывает прогресс + toast при >2 мин; в README явно описать поведение |
| 3 | Claude Design генерит медленно / посредственно | Med | Бэкап: shadcn/ui «как есть» + наши Tailwind токены = MVP UI за 4ч |
| 4 | Alchemy RPC падает | Low | Multi-RPC failover: Alchemy + Infura + public RPC через wagmi |
| 5 | Mismatch дизайна и реальной разметки | High | Дизайн использует РОВНО те же Tailwind-токены, что в коде; финальный pixel-pretty pass перед сдачей |

---

## 9. 48-часовой таймлайн

Час 0 = 30.05.2026 06:00 GMT+3

### Phase 1: Setup & Contract (часы 0-12) — ночь субботы

| Часы | Задача | Definition of Done |
|---|---|---|
| 0-1 | Init Next.js 15 + Tailwind v4 + Foundry; `.env.example`; README шаблон | `pnpm dev` + `forge test` отвечают |
| 1-2 | wagmi/RainbowKit config; Alchemy RPC; VRF subscription готов | Connect Wallet работает на Sepolia |
| 2-6 | `CasinoDice.sol`: code + 10 unit + 2 fuzz; coverage ≥90% | `forge test` зелёный, `forge coverage` ≥90% |
| 6-8 | Deploy script + Etherscan verify; депозит house bankroll ~0.5 ETH; add consumer в VRF sub | Source видим на Etherscan |
| 8-10 | E2E smoke через cast: deposit → bet → wait VRF → settle → withdraw | Цикл работает на live Sepolia |
| 10-12 | ABI export через wagmi-cli; базовый `useDiceContract` hook | `pnpm typecheck` зелёный |

### Phase 2: Frontend Core (часы 12-30) — день воскресенья

| Часы | Задача | DoD |
|---|---|---|
| 12-14 | Глобальные стили + токены; layout; ConnectButton в хедере | Голая страница с темой + connect |
| 14-18 | `/dice`: BetForm (slider + amount), BetButton multi-state; `useWriteContract` | Можно сделать ставку из UI |
| 18-22 | Dice canvas с цифровым табло + animations; phase pill; Deposit/Withdraw modals | Полный bet-cycle видим в UI |
| 22-26 | Live feed + My Bets через `useWatchContractEvent` WS; empty states | Real-time updates работают |
| 26-30 | Lobby + Landing + Stats bar; live ticker; coming-soon tiles | Главная готова |

### Phase 3: Polish & Deliver (часы 30-46) — ночь воскресенья / утро понедельника

| Часы | Задача | DoD |
|---|---|---|
| 30-34 | `/proof/[requestId]` — full provably-fair flow | Доступна из feed |
| 34-38 | Error states, edge cases: balance 0, не подключён, VRF stall, network mismatch | QA-чеклист зелёный |
| 38-40 | Stretch: auto-bet (только если время есть) | — |
| 40-42 | README: что работает, AI tooling debrief, hardest unknown, what's next | README сдан |
| 42-44 | Vercel deploy + Sepolia prod smoke; Etherscan link в README | Live URL работает |
| 44-46 | **Loom recording** (5 минут) | Залит, ссылка в Notion |

### Phase 4: Buffer (часы 46-48)

| Часы | Задача |
|---|---|
| 46-47 | Notion-страница: GitHub + Live URL + README highlights + Loom |
| 47-48 | Submit в Telegram @ryazhenkacustomers с буфером в 1 час |

---

## 10. Pre-flight checklist (выполнить ДО 06:00 GMT+3 30 мая)

Критично — некоторые шаги требуют времени независимо от нас.

- [ ] **Chainlink VRF v2.5 subscription на Sepolia** создан на vrf.chain.link
- [ ] Subscription залит ≥ **5 LINK** (faucets.chain.link/sepolia)
- [ ] Dev-кошелёк имеет ≥ **0.5 Sepolia ETH** (sepoliafaucet.com + Google Web3 faucet)
- [ ] **Alchemy account** + Sepolia app → API key получен
- [ ] **Etherscan API key** получен (для `forge verify`)
- [ ] **GitHub repo** `vibecode-web3-casino` создан (можно пустой)
- [ ] **Vercel account** linked to GitHub
- [ ] **WalletConnect Cloud project** создан → projectId получен
- [ ] **Loom account** (free, 5-минутный лимит — ровно сколько надо)
- [ ] **Notion workspace** готов для submit-страницы
- [ ] Второй кошелёк MetaMask с тестовым ETH (для свежего first-time UX в Loom)
- [ ] Опционально: домен `truedice.fun` / `truedice.io` куплен (~$5/год)

---

## 11. Definition of Done (мэппинг на конкурс)

| Требование конкурса | Где закрыто в TASK.md |
|---|---|
| Connect a wallet | RainbowKit modal §5 |
| Deposit test tokens | `deposit()` §4 + Deposit modal §5 |
| Play a game (win/lose) | `placeBet → VRF → settle` §4, `/dice` §5 |
| Withdraw balance back | `withdraw()` §4 + Withdraw modal §5 |
| Verifiable on-chain | `/proof/[requestId]` §5 + verified Etherscan source §3 |
| Testnet only | Sepolia L1, deployer config §7 |
| Public URL | Vercel §3 |
| House edge | 1% в multiplier formula §4 |
| README покрывает все пункты | Phase 3 §9 (40-42ч) |
| 5-min Loom | Phase 3 §9 (44-46ч) |
| Bonus: AI tooling | Секция в README, Phase 3 §9 |

---
