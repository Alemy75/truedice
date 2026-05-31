# DESIGN.md — True Dice Visual System

> Полная визуальная система продукта: палитра, типографика, layouts, компоненты, аниматика, копирайт-tone.
> Этот файл — единственный source of truth для дизайна; одновременно служит брифом для Claude Design / Figma Make.

---

## 1. Brand

- **Имя продукта:** `True Dice`
- **Тэглайн:** «Provably fair, on-chain dice. No house secrets.»
- **Парент-бренд:** TrueLabel (iGaming operator)
- **Категория:** Web3 casino, on-chain dice
- **Wordmark:** monospace, all-caps `TRUE DICE` (трек-літера +0.05em), либо две строки `TRUE` / `DICE` в hero

---

## 2. Mood / Aesthetic

**One-liner:** *Monte Carlo VIP table, recreated for a paranoid crypto-native player.*

**Эстетика:** luxury casino + Web3 transparency. Глубокий чёрный, металлическое золото, тёплый off-white. Чувствуется как кожаное кресло у крупье, но управляется блокчейном.

**References (для калибровки):**
- **Casino de Monte-Carlo** — золотая фурнитура на чёрном бархате
- **Aston Martin DB website** — pure black + champagne metallic
- **Hennessy / Dom Perignon** — типографическая иерархия, breathing room
- **Stake.com VIP / Roobet** — современные крипто-казино, но без неоновой кислотности

**Эстетические запреты:**
- ❌ Никакого неона / acidic green / cyberpunk
- ❌ Никаких skeuomorphic chips / dice icons / playing cards
- ❌ Никаких градиентов на тексте
- ❌ Никакого glassmorphism / frosted glass
- ❌ Никаких confetti на выигрышах (слишком детское)
- ❌ Никакого screen shake на проигрышах (luxury не дёргается)

**Эстетические императивы:**
- ✅ Серифный display-шрифт для headings — это ключевой luxury-сигнал
- ✅ Тёплый чёрный (с лёгким brown undertone), а не серо-синий чёрный
- ✅ Off-white текст (champagne #F5EFE0), не pure white
- ✅ Тонкие золотые ободки (`shadow-gold-rim`) на премиум-карточках
- ✅ Generous spacing — дышим, не теснимся

---

## 3. Color Tokens (Tailwind v4 `@theme`)

Палитра построена на двух осях: **gold spectrum** (брендинг + выигрыш) и **warm black surfaces** (фон + поверхности с лёгкой тёплой подложкой).

```css
@import "tailwindcss";

@theme {
  /* === Brand — gold spectrum === */
  --color-primary: #D4AF37;            /* metallic gold — signature accent */
  --color-primary-hover: #E5C76B;      /* lighter gold — hover state */
  --color-primary-pressed: #B8941F;    /* darker gold — pressed state */
  --color-primary-foreground: #0A0908; /* near-black — text on gold surfaces */
  --color-accent: #C9A961;             /* champagne — secondary highlights */

  /* === Surfaces — warm black, low → high elevation === */
  --color-background: #050403;         /* root bg — almost black with brown hint */
  --color-surface: #0E0C0A;            /* cards, sections */
  --color-surface-elevated: #1A1714;   /* modals, dropdowns */
  --color-surface-overlay: #26211C;    /* tooltips, top-most surfaces */

  /* === Foreground — warm off-white, high → low contrast === */
  --color-foreground: #F5EFE0;         /* primary text — champagne off-white */
  --color-foreground-muted: #B8AE9C;   /* secondary text — warm gray */
  --color-foreground-subtle: #6B6358;  /* tertiary / disabled — dark warm gray */

  /* === Borders === */
  --color-border: #2A241D;             /* default card border — warm dark */
  --color-border-subtle: #161310;      /* internal dividers */
  --color-border-gold: rgba(212, 175, 55, 0.25); /* gilded edge — premium accent */

  /* === Semantic === */
  --color-success: #D4AF37;            /* gold = win (= primary) */
  --color-danger: #8B2C2C;             /* deep crimson — loss, errors */
  --color-warning: #C0C0C0;            /* silver — VRF pending, neutral */

  /* === Radii — sharper than playful brands === */
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
  --font-sans: "Geist", system-ui, -apple-system, sans-serif;
  --font-mono: "Geist Mono", ui-monospace, monospace;
}
```

### Token usage rules (strict)

1. **Никогда не изобретать цвет вне палитры.** Если нужен оттенок — выводить через opacity: `text-foreground/60`, `bg-primary/10`, `border-primary/30`.
2. **Primary как scarcity:** `#D4AF37` — самый громкий цвет. Один primary action на экран. Использовать на: главной CTA, win states, wordmark, активное состояние тогглов. НЕ использовать на body links, info-тегах, общих border'ах.
3. **Foreground — всегда off-white**, никогда `#FFFFFF`. Pure white на чёрном фоне выглядит дёшево и режет глаз.
4. **Surface hierarchy через цвет, не через тень**: `background → surface → surface-elevated → surface-overlay`. Тени только для модалок над страницей и для glow эффектов.
5. **Gold-rim только** на премиум-элементах: главный CTA, dice canvas card, активная game tile в лобби, hero card в лендинге.

---

## 4. Typography

### Семейства шрифтов

| Роль | Family | Где используется | Источник |
|---|---|---|---|
| **Display (Serif)** | Cormorant Garamond | H1 на hero, главные заголовки страниц | Google Fonts (free) |
| **Body (Sans)** | Geist | Весь body, нав, buttons, форма | Vercel/`geist` package |
| **Numbers (Mono)** | Geist Mono | Числа, hex, адреса, hashes, request IDs, block numbers | Vercel/`geist` package |

### Иерархия размеров

```
Hero H1 (display)        96px / 1.05 / -0.02em / italic вариант для строки 2
Page H1 (display)        56px / 1.10 / -0.02em
H2 (display)             40px / 1.15 / -0.01em
H3 (sans)                28px / 1.25 / -0.005em / 600 weight
H4 (sans)                20px / 1.30 / 600 weight
Body lg (sans)           18px / 1.55
Body (sans)              16px / 1.55
Body sm (sans)           14px / 1.50
Eyebrow / Label (sans)   12px / 1.40 / uppercase / tracking +0.10em
Caption (sans)           12px / 1.40
Mono large (mono)        128px / 1.0 / -0.04em — dice canvas number
Mono lg (mono)           24px / 1.30
Mono md (mono)           16px / 1.40
Mono sm (mono)           12px / 1.30
```

### Strict typography rules

- **Numbers / addresses / hashes / hex / block numbers / request IDs** → всегда `font-mono`. Без исключений.
- **Headings ≥ 32px** → `tracking-tight` (-0.02em), `font-display`
- **Body** → `font-sans`, line-height 1.55
- **Display строка 2** в hero (та, что в gold) → `italic` для контраста (`Cormorant Garamond Italic` — оригинальный luxury треат)
- **Buttons** → `font-sans`, 600 weight, no tracking adjustments

---

## 5. Spacing & Layout

- **Container max-width:** 1280px (desktop)
- **Section padding:** `py-24` (desktop) / `py-12` (mobile) — generous breathing
- **Card padding:** `p-8` (default) / `p-6` (compact) / `p-12` (hero)
- **Gap между секциями:** минимум 96px на desktop
- **Form spacing:** 24px между секциями формы, 12px между label и input
- **Tables:** row padding 16px vertical, 24px horizontal

---

## 6. Visual Language Rules

### Поверхности и elevation

- Самый глубокий слой — `background` (страница)
- На него ложатся `surface` карточки (1px `border` ободок)
- Модалки и dropdowns — `surface-elevated` (тёплая тень `shadow-card`)
- Tooltips и top-most overlay — `surface-overlay`

**Никогда** не используем `shadow` для отделения карточек от фона — всё через цвет поверхности.

### Премиум-сигналы (gold-rim treatment)

Применяются точечно к 4 элементам:
1. Главный CTA `ROLL DICE` button — `shadow-gold-rim` всегда + `shadow-glow-primary` на hover
2. Dice canvas card — `shadow-gold-rim` (тонкий золотой кант)
3. Hero card в лобби — `shadow-gold-rim` (опционально, если визуально нужно)
4. Active game tile (`Dice` тайл) — `shadow-gold-rim-strong` чтобы отделить от `SOON` тайлов

### Borders

- Стандартный card border: 1px solid `border` (warm dark)
- Внутренние дивайдеры: 1px solid `border-subtle` (почти невидимые)
- Премиум-кант: `shadow-gold-rim` (inset 1px, gold с opacity)
- Inputs: 1px `border`, focus state → 1px `primary`

### Glow effects (используем экономно)

- Primary CTA hover → `shadow-glow-primary` (мягкое золотое свечение)
- Win state на dice canvas → `shadow-glow-primary` (более интенсивный)
- Error state на input → `shadow-glow-danger`
- Loss state на dice canvas → крадущийся crimson glow (анимированно появляется на 800ms, уходит на 1200ms) — НЕ shake

### Микро-детали luxury

- На главной CTA — едва заметная **золотая текстура grain** через `background-image: url('data:image/svg+xml;...noise...')` (subtle, opacity 8%)
- На hero card — едва заметная **vignette** (radial gradient к краям, очень мягкая)
- Wordmark `TRUE DICE` — золотой, с **легчайшим letter-spacing** (`tracking-widest`)

---

## 7. Copy / Voice

**Tone:** confident, sparse, technical, slightly aloof — как сомелье, не как зазывала.

**Принципы:**
- **Specific numbers**, не размытые формулировки: «Verify in 3 clicks» — не «Easy to verify»
- **Crypto-native terms без апологий**: mempool, VRF, fulfillment, requestId, block — пишем уверенно
- **Mono для chain-data inline**: «Block 6238472», «Tx 0xabc...»
- **Никакого хайпа**: НЕ «🚀 Amazing instant casino!», ДА «Provably fair. On-chain. Done.»
- **Микрокопия на английском** — продукт en-only

**Палитра коротких фраз для разных мест:**
- Hero subhead: «Every roll is decided by Chainlink VRF and settled in a single transaction. Verify any outcome on Etherscan in under a minute.»
- Empty My Bets: «Your bets will appear here. The chain remembers everything.»
- VRF wait: «Awaiting randomness from Chainlink VRF. This is the slow part — and the reason you can trust it.»
- Win toast: «Won 0.0020 ETH · Block 6238473 ↗»
- Loss toast: «Better luck next roll. House edge: 1.00%»
- Proof footer: «Anyone with the requestId and the public blockchain can derive this same result. We can't change it. We didn't generate it. That's the point.»

---

## 8. Pages — Detailed Layouts

### 8.1 Landing + Lobby (`/`)

**Section A — Top nav (sticky, transparent, blurs on scroll):**
- Left: wordmark `TRUE DICE` (mono uppercase, primary color, tracking-wider)
- Center: nav links `Dice / Live / About` (sans, foreground-muted, gold on hover with underline)
- Right: `Connect Wallet` button (primary CTA)

**Section B — Hero (full viewport height, centered):**
- Eyebrow: `ON-CHAIN · CHAINLINK VRF · ETHEREUM SEPOLIA` (12px mono uppercase, tracking +0.20em, foreground-subtle)
- H1 line 1: «Provably fair dice.» (96px display, foreground, tracking-tight)
- H1 line 2: «No house secrets.» (96px display **italic**, primary gold, tracking-tight)
- Subhead: «Every roll is decided by Chainlink VRF and settled in a single transaction. Verify any outcome on Etherscan in under a minute.» (20px sans, foreground-muted, max-width 560px, centered)
- Button row: `Enter Casino →` (primary CTA, large, gold-rim) + `How it works` (ghost, foreground-muted hover gold)

**Section C — Stats strip (full-width band, surface bg, py-12):**
3 колонки разделены `border-subtle`:
- Col 1: label `TOTAL WAGERED` (eyebrow) + value `1,247.32 ETH` (32px mono, foreground)
- Col 2: label `BETS SETTLED` + value `82,491` (32px mono)
- Col 3: label `BIGGEST WIN · 24H` + value `+12.4 ETH` (32px mono, **primary gold**)

**Section D — Game lobby:**
- Section header: H2 `Games` (40px display) + subtitle «One live. More coming.» (16px sans, foreground-muted)
- Grid: 5 tiles, responsive (1 col mobile / 2-3 tablet / 5 desktop)
  - **Dice tile** (active): aspect-square, surface bg, `shadow-gold-rim-strong`, hover scale 1.02 with `shadow-glow-primary`, top-right `LIVE` badge (gold dot + uppercase eyebrow), game name `DICE` mono center, one-line description below «On-chain Chainlink VRF»
  - **Slots / Plinko / Roulette / Coin Flip** (4 tiles): grayscale, opacity 40%, top-right `SOON` badge (silver-warning dot + uppercase eyebrow), cursor not-allowed

**Section E — Live wins marquee (full-width strip, surface bg, py-6):**
- Single line, infinite scroll right→left
- Each item: `[Jazzicon] [0x7a3...d2f] won [+0.0240 ETH] on Dice · [2m ago] · [↗]`
- 14px, mono for amounts/addresses/time, sans for connectors
- Gold accent on amount when win is large (>5x stake)

**Section F — Footer:**
- Left col: wordmark `TRUE DICE` + tagline «Provably fair, on-chain dice.» (14px sans foreground-muted)
- Center col: `Contract` label + address (mono, click to copy, hover gold) + small Etherscan link
- Right col: links `GitHub ↗`, `Provably Fair ↗`, `About ↗` (sans, foreground-muted, hover gold)
- Bottom band: copyright + «Testnet only. Not available where prohibited.»

### 8.2 Dice (`/dice`)

**Layout:** two-column desktop (≥ 1024px), stacked mobile. Сюда уходит максимум полировки.

**Top bar (sticky, transparent → blur on scroll):**
- Left: wordmark `TRUE DICE`
- Right cluster (gap-4):
  - Network badge: `SEPOLIA` (small pill, silver-warning border, uppercase eyebrow внутри)
  - Balance pill: `Balance · 0.0500 ETH ▼` (mono для числа, sans для label) → dropdown с `Deposit / Withdraw`
  - Address chip: `0x7a3...d2f` (mono, truncated middle) → dropdown с `Copy / Disconnect`

**Left column — dice visual (~60% width on desktop):**
- Card: aspect-1 квадрат, `surface` bg, `shadow-gold-rim`, `radius-xl`
- Внутри (centered):
  - **Huge number** — 128px `font-mono`, tracking -0.04em
    - **Idle:** `————` в `foreground-subtle`
    - **Rolling** (VRF pending): rapid shimmer between 0000-9999, замедляющийся к концу
    - **Win:** snap на result, color `foreground → primary`, soft pulse, `shadow-glow-primary` появляется на 1.5s
    - **Loss:** snap на result, color stays `foreground`, опционально crimson glow появляется и уходит за ~2s (НЕ shake)
  - Под числом, 24px mono:
    - `Result · 2138 / 9999` (foreground)
    - `Win Under · 4950` (foreground-muted)
- **Phase pill** в нижней части card (24px высотой, padded, `surface-elevated` bg, radius-md):
  - `Idle — Ready to roll`
  - `Confirm in wallet…`
  - `Broadcasting transaction…`
  - `Awaiting VRF · ≈30s` (с silver-warning точкой)
  - `WON +0.0010 ETH` (с gold точкой)
  - `LOST -0.0010 ETH` (с crimson точкой)

**Right column — bet form (~40% width):**
- Card: `surface` bg, `border` ободок, `radius-lg`, p-8

**Win Chance section:**
- Label row: `WIN CHANCE` (eyebrow) on left, value `49.50 %` (18px mono foreground) on right
- Custom slider:
  - Track 6px высотой, `border-subtle` bg, full radius
  - Filled portion: `primary` gold
  - Thumb: 24px круглый, `surface-overlay` bg, 2px gold ring, slight shadow
  - Range: 2.00 → 98.00% (snap 0.01% = 1 bps)
- Two read-only rows ниже:
  - `Multiplier` (eyebrow) | `2.0000 ×` (18px mono **primary gold**)
  - `Roll Under` (eyebrow) | `4950` (18px mono foreground-muted)

**Bet Amount section** (с visual separator выше):
- Input: 56px высотой, `surface-overlay` bg, 1px border, right-aligned value, mono, font-size 24px, ETH suffix внутри (foreground-muted)
- Quick-bet row под input: `½` `2×` `Max` (ghost buttons, sm size, mono, gap-2)
  - `½` halves current bet value
  - `2×` doubles it
  - `Max` устанавливает максимально допустимое (capped by bankroll cap или баланс игрока — что меньше)

**Computed row:**
- `Profit on Win` (eyebrow) | `+0.0010 ETH` (18px mono **primary gold** if > 0; foreground-subtle `—` if no bet)

**CTA button** (full width, 64px высотой, mt-6):
- `radius-md`
- `bg-primary` gold
- `text-primary-foreground` near-black
- `font-sans semibold 20px`
- `shadow-gold-rim` всегда
- `shadow-glow-primary` on hover
- Disabled state: opacity 50%, no glow
- Multi-state label синхронно с phase pill:
  - `ROLL DICE` (idle)
  - `CONFIRM IN WALLET` (after click)
  - `BROADCASTING…` (tx pending)
  - `AWAITING RANDOMNESS` (VRF pending)
  - `ROLL DICE` (returns after settle)

**Bottom section — tabs (full width under обеих колонок):**
- Tab list: `My Bets / Live Feed / High Rollers · 24h`
- Active: `foreground` text + 2px `primary` underline
- Inactive: `foreground-muted` text, hover gold
- Tab content — DataTable:
  - Columns: `Time` (relative, foreground-muted sans) | `Player` (AddressChip mono, hidden on `My Bets`) | `Chance` (mono) | `Roll` (mono с inline ✓/✗ в success/danger) | `Stake` (mono) | `Payout` (mono **primary gold** if positive, foreground-subtle `—` if loss) | `Verify ↗` (icon button → `/proof/[requestId]`)
  - Row hover: `surface-elevated` bg
- Empty state: иконка + «Your bets will appear here. The chain remembers everything.» (foreground-muted sans 14px, mono для слов которые относятся к контракту)

### 8.3 Proof (`/proof/[requestId]`)

Полная страница на desktop, sheet (bottom-attached) на mobile.

**Header:**
- Title: «Provably Fair Verification» (32px display, foreground)
- Subtitle: `Roll #1023845` (16px mono foreground-muted)
- Top-right: button `Open on Etherscan ↗` (ghost primary, gold border, gold text)

**Vertical stepper — 4 cards в вертикальный stack, gap-6:**

Каждая card: `surface` bg, `border` ободок, `radius-lg`, p-8.

**Card 1 — Bet Placed:**
- Eyebrow header: `STEP 1 · BET PLACED`
- Key-value pairs (label sans foreground-muted | value mono foreground):
  - Player: `0x7a3...d2f ↗`
  - Stake: `0.001 ETH`
  - Roll Under: `4950 (49.50%)`
  - Multiplier: `2.0000×`
- Footer link: `Transaction · 0xabc...123 ↗` + `Block · 6238472 ↗` (both mono, both Etherscan links, gold underline on hover)

**Card 2 — VRF Request:**
- Eyebrow: `STEP 2 · CHAINLINK VRF REQUEST`
- Body text (sans foreground-muted): «Contract called `requestRandomWords()` on Chainlink VRFCoordinatorV2_5. The request is now waiting for verifiable randomness.»
- Key-values:
  - Request ID: `78394201845207...` (mono, wrapped if long)
  - Subscription ID: `12345`
  - Confirmations required: `3`

**Card 3 — VRF Fulfillment:**
- Eyebrow: `STEP 3 · VRF FULFILLMENT`
- Body: «Chainlink VRF oracle returned cryptographically verifiable randomness.»
- Random word block:
  - Label: `Random Word (256 bits)`
  - Value: `0x4f2e9a8b1c7d3e5f6a8b...` (mono, wrap-anywhere, foreground, p-4 surface-elevated bg, radius-md)
- Footer link: `Fulfillment Tx · 0xdef...456 ↗`

**Card 4 — Settlement:**
- Eyebrow: `STEP 4 · SETTLEMENT`
- Body: «Contract deterministically calculated the result and paid out.»
- Calculation block (monospace, code-style):
  ```
  result = randomWord % 10000
         = 2138

  2138 < 4950 (rollUnder)
         → WIN ✓

  payout = stake × multiplier
         = 0.001 × 2.0000
         = 0.0020 ETH
  ```
- Result row (highlighted в gold-rim card-in-card):
  - `OUTCOME · WON +0.0010 ETH net` (primary gold, large)

**Footer paragraph** (max-width 640px, foreground-muted, italic display):
> «Anyone with the requestId and the public blockchain can derive this same result. We can't change it. We didn't generate it. That's the point.»

### 8.4 About (`/about`)

Минимальная страница. Одна колонка, max-width 720px, центрированная.

- H1: «How True Dice Works» (40px display)
- Sections (H3 + body, sans):
  1. **The Game** — описание dice, как работает winChance/multiplier
  2. **The Math** — формула выплаты, house edge
  3. **The Proof** — Chainlink VRF, link на /proof/[example-requestId]
  4. **The Code** — link на GitHub + verified Etherscan contract
- В каждой секции mono inline для цифр и адресов

### 8.5 Modals — Deposit / Withdraw / Connect Wallet

Все модалки:
- Backdrop: `bg-background/80 backdrop-blur-md`
- Container: max-width 440px, `surface-elevated` bg, `shadow-card`, `radius-lg`, p-8
- Close button top-right: ghost icon `×`, foreground-muted hover gold
- Title: 24px display foreground
- Subtitle (optional): 14px sans foreground-muted
- Body: form content with appropriate gaps
- Primary CTA at bottom: full width, 56px height, `bg-primary`
- Below CTA: contextual hint в foreground-subtle 12px sans

**Deposit modal specific:**
- Title: «Deposit ETH»
- Subtitle: «Your balance funds bets. Withdraw any time.»
- Input: large, mono, right-aligned, ETH suffix
- Quick presets row: `0.01` `0.05` `0.1` `Max` (ghost mono sm)
- CTA: `DEPOSIT 0.0100 ETH` (gold)
- Hint: «Need Sepolia ETH? Get some at sepoliafaucet.com ↗»

**Withdraw modal specific:**
- Title: «Withdraw ETH»
- Subtitle: «Available · 0.0500 ETH» (mono, foreground)
- Same input/presets pattern
- CTA: `WITHDRAW 0.0100 ETH`
- Hint: «Funds return to your connected wallet in one transaction.»

**Connect Wallet modal:**
- Title: «Connect Wallet»
- Subtitle: «Choose a wallet to play.»
- List of options (RainbowKit modal — мы не дизайним сам список, но wrapper customizable):
  - MetaMask
  - WalletConnect
  - Coinbase Wallet
- Hint: «Connecting is free. We never see your private key.»

### 8.6 Error / Empty States — ОБЯЗАТЕЛЬНО все

| Сценарий | Где появляется | Дизайн |
|---|---|---|
| Not connected | `/dice` правая колонка | Form задизейблен, поверх — overlay с `Connect Wallet` CTA |
| Connected, balance = 0 | `/dice` → автоопен Deposit modal | См. Deposit modal |
| Wrong network (не Sepolia) | Глобально → top banner | Гёлд-rim banner с `Switch to Sepolia` кнопкой |
| No bets yet (My Bets) | Tab content | Centered icon + «Your bets will appear here…» (см. copy) |
| No bets yet (Live Feed) | Tab content | «No bets yet. Be the first to roll.» |
| VRF stalled > 2 min | Toast | «Awaiting VRF longer than usual. Your stake is safe — see [Etherscan ↗] or refresh.» |
| Insufficient bankroll for bet size | CTA disabled + helper text below | «Bet exceeds 1% of casino bankroll. Reduce bet or wait for next roll.» |
| Tx rejected by user | Toast | «Transaction rejected. No funds moved.» |
| Tx failed on-chain | Toast | «Transaction failed. [Etherscan ↗]» |
| 404 page | `/[anything-else]` | Centered: «Roll not found.» + Back to lobby button |
| Generic error boundary | На любой crash | «Something broke. The chain didn't. [Refresh]» |

---

## 9. Component Library — 10 reusable atoms

Каждый — один файл в `components/shared/` или `components/ui/`, использует только токены выше.

| # | Component | Variants | Описание |
|---|---|---|---|
| 1 | **Button** | `primary` (gold) / `secondary` (surface-overlay) / `ghost` (transparent) / `danger` (crimson) | Sizes `sm 36px / md 44px / lg 52px / xl 64px`. Optional `shadow-gold-rim` for premium. |
| 2 | **AddressChip** | Default / with jazzicon | mono, truncated middle (`0x7a3...d2f`), copy on click → toast «Copied». Hover: gold underline. |
| 3 | **TxStatusPill** | `pending` (silver dot) / `success` (gold dot) / `failed` (crimson dot) | Pill shape, surface-overlay bg, mono text. |
| 4 | **NumberFlipDisplay** | sm/md/lg/xl | Mono number с flip-card animation между значениями (600ms cubic-bezier). |
| 5 | **StatCard** | Default / with delta | Eyebrow label + large mono value + optional delta (primary/danger). Used in stats strip. |
| 6 | **DataTable** | Default | Header row + body rows, row hover surface-elevated, mono для number columns. |
| 7 | **EtherscanLink** | inline / button | text + external-link icon (lucide `external-link`), gold on hover, subtle underline. |
| 8 | **PhasePill** | `idle / confirm / broadcast / await-vrf / won / lost` | Pill с dot indicator цвета phase + sans text. |
| 9 | **Slider** | Default | Custom track 6px, gold fill, surface-overlay thumb with gold ring. |
| 10 | **Input** | `sm / lg` | Surface-overlay bg, 1px border, focus → primary border, mono for numbers. Suffix slot (ETH, %). |

---

## 10. Animation Rules

| Trigger | Duration | Easing | Detail |
|---|---|---|---|
| Hover на любом интерактиве | 150ms | ease-out | Color / shadow transitions |
| Modal enter | 200ms | ease-out | slide-up 8px + fade |
| Modal exit | 150ms | ease-in | fade out |
| Win — gold shimmer cascade | 2000ms | gravity-based | ~30 gold particles spawn at canvas top, fall with gravity, fade out. Replaces confetti. Use `canvas-confetti` lib with `colors: ["#D4AF37", "#E5C76B", "#C9A961"]`, `gravity: 1.2`, `particleCount: 30`, `scalar: 0.8`. |
| Loss — crimson glow | 800ms in / 1200ms out | ease-out / ease-in | `shadow-glow-danger` появляется на dice canvas card. НЕ shake. |
| Number flip (digits) | 600ms | cubic-bezier(0.4, 0, 0.2, 1) | Each digit individually rotates Y-axis 180° |
| VRF wait shimmer | continuous | — | Random digit cycling, interval starts 50ms, slows к 250ms к моменту fulfillment (если знаем когда оно придёт; иначе continuous) |
| Live ticker marquee | 60s per loop | linear | Right→left infinite, pause on hover |
| CTA button hover glow | 200ms | ease-out | `shadow-glow-primary` появляется |
| Tab switch | 150ms | ease-out | Underline slides, content fades |

**Performance gates:**
- Никаких heavy CSS animations на mobile если можно избежать
- `prefers-reduced-motion` respected: shimmer заменяется на static, confetti отключается, marquee на пауза

---

## 11. Deliverables (что нужно от дизайнера / Claude Design)

В порядке готовности:

1. **`app/globals.css`** — полный `@theme` block (раздел 3) + base resets (`*, *::before, *::after { box-sizing: border-box }`, body bg, color, font), Google Fonts import для `Cormorant Garamond` + локальные Geist
2. **10 atoms** (раздел 9) — каждый как shadcn/ui-стиль React + Tailwind, использующий ТОЛЬКО токены из раздела 3
3. **Figma file** с экранами в порядке:
   1. Lobby (раздел 8.1)
   2. Dice — states: idle, rolling, won, lost (8.2)
   3. Proof (8.3)
   4. Modals — Deposit, Withdraw (8.5)
   5. Empty/Error states из 8.6
   6. About (8.4) — последний приоритет
4. **404 + generic error page** (8.6 последние два)
5. **Component library page** в Figma — все 10 atoms в их variants, side-by-side

---

## 12. Готовый бриф для Claude Design / Figma Make (copy-paste)

> Скопировать всё содержимое разделов 1-11 этого файла как первое сообщение в Claude Design / Figma Make. Файл написан в формате, годном для прямой передачи дизайн-инструменту — не нужно дополнительной обвязки.
