# Ki0xk Kiosk UI

Touch-first interface for Ki0xk physical crypto ATMs. Designed for tablets mounted inside kiosk enclosures where users insert cash and receive USDC.

Built with Next.js 16, React 19, Tailwind CSS v4, and shadcn/ui. Retro arcade aesthetic with holographic glows, scanlines, and pixel art styling.

> Cash in, crypto out. No wallet needed.

---

## How It Works

```
┌─────────────┐     ┌──────────────────┐     ┌────────────────────┐
│  Insert      │ ──▶ │   Ki0xk Kiosk    │ ──▶ │  User gets USDC    │
│  Cash/Coins  │     │   (tablet UI)    │     │  on any EVM chain  │
└─────────────┘     └──────────────────┘     └────────────────────┘
                            │
                   ┌────────┴────────┐
                   │                 │
             QR Scan / ENS      Print PIN
             (has wallet)     (no wallet)
```

### Buy Crypto Flow

| Step | Screen | Action |
|------|--------|--------|
| 1 | Select Asset | Choose USDC |
| 2 | Insert Coins | Tap coin buttons (1/2/5 pesos) — simulates Arduino coinslot |
| 3 | Confirm Amount | Review fee breakdown (0.001%) |
| 4 | Processing | Session opens on Yellow Network |
| 5 | Choose Destination | QR scan, ENS name, NFC (coming soon), or Print PIN |
| 6 | Select Chain | Pick from 7 testnets (Base, Ethereum, Arbitrum, Polygon, Optimism, Avalanche, Linea) |
| 7 | Settling | Bridge via Circle Arc CCTP |
| 8 | Done | Receipt with TX hash |

### I Have a PIN Flow (First-Timers)

| Step | Screen | Action |
|------|--------|--------|
| 1 | Enter PIN | 6-digit PIN from receipt |
| 2 | Enter Wallet ID | 6-character alphanumeric code (0-9 + A-D) |
| 3 | Show Balance | Display stored USDC amount |
| 4 | Choose Destination | QR scan or ENS name |
| 5 | Select Chain | Pick destination network |
| 6 | Done | USDC claimed to wallet |

**No KYC. No gas fees. No seed phrases. No waiting.**

---

## Quick Start

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # Production build
pnpm lint         # ESLint
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16, React 19, TypeScript 5 |
| Styling | Tailwind CSS v4, CSS custom properties, custom keyframes |
| UI Components | shadcn/ui (New York style), Radix UI primitives, Lucide icons |
| State | React Context + `useReducer` (`lib/state.tsx`) |
| QR Scanner | html5-qrcode (dynamic import, SSR-safe) |
| Font | Press Start 2P (Google Fonts) — pixel arcade aesthetic |
| Animations | tw-animate-css, custom CSS (coin-drop, nfc-pulse, holo-sweep, tilt-warning) |

---

## Routes

### Kiosk Mode (Cash-to-Crypto ATM)

| Route | Purpose |
|-------|---------|
| `/` | Landing — value prop, "Start Demo" CTA |
| `/app` | Mode selector — Kiosk or Festival |
| `/app/kiosk` | Menu — "Buy Crypto" or "I Have a PIN" |
| `/app/kiosk/buy` | Buy Crypto flow (12-step state machine) |
| `/app/kiosk/claim` | Claim PIN flow (9-step state machine) |

### Festival Mode (Wristband Payments)

| Route | Purpose |
|-------|---------|
| `/app/festival` | Festival mode selector — Admin or Public |
| `/app/festival/admin` | Load NFC cards via PIN (demo: `1234`) |
| `/app/festival/public` | Pay vendors or recharge balance |

### Legacy Redirects

| Old Route | Redirects To |
|-----------|-------------|
| `/app/kiosk/new-user` | `/app/kiosk/buy` |
| `/app/kiosk/add-balance` | `/app/kiosk/buy` |
| `/app/kiosk/scan` | `/app/kiosk` |
| `/app/kiosk/wallet` | `/app/kiosk` |

---

## Components

### Kiosk Components (`components/ki0xk/`)

| Component | Description |
|-----------|-------------|
| `CoinSlotSimulator` | Three coin buttons (1/2/5 pesos) with running total, simulated Arduino JSON output |
| `OnScreenKeyboard` | Full QWERTY + numbers for tablet. CAPS toggle, `.eth` shortcut, `0x` prefix, `←` backspace. Wide rectangle layout |
| `ChainSelector` | Vertical list of 7 testnet chains with radio selection |
| `QrScanner` | Camera QR reader via html5-qrcode. Validates Ethereum addresses and ENS names |
| `PinDisplay` | 6-digit PIN in gold boxes, 6-char wallet ID in purple boxes, red tilting "save this PIN" warning |
| `PinKeypad` | Phone-style 3x4 grid (0-9, *, #) with masked display for PIN entry |
| `WalletIdKeypad` | 4x4 grid (0-9, A-D) matching physical keypad for wallet ID entry |

### Shared Components

| Component | Description |
|-----------|-------------|
| `ArcadeButton` | Retro button with glow. Variants: primary (gold), secondary (dark), accent (cyan), danger (red) |
| `CoinAnimation` | Falling coins overlay with staggered delays |
| `NumericKeypad` | 3x4 numeric grid with optional PIN masking |
| `NFCIndicator` | NFC icon with animated SVG waves (ready/scanning/success/error) |
| `PixelFrame` | Arcade cabinet frame wrapping all `/app` routes. Holographic border, scanlines, pixel grid |
| `ProgressBar` | 10-segment bar with holographic gradient. Auto-increments, fires `onComplete` |
| `Modal` | Dialog with backdrop blur and holographic border |
| `Toast` | Top-center notification (success/error) with auto-dismiss |

---

## State Management

Global state via `Ki0xkProvider` context wrapping `/app` routes:

```typescript
Ki0xkState {
  sessionId              // Yellow Network session
  totalDepositedPesos    // Cash inserted
  totalDepositedUSDC     // Converted value
  coinInsertions[]       // Each coin event {pesos, usdc, timestamp}
  destinationAddress     // QR/ENS destination
  destinationChain       // Selected chain key
  destinationMethod      // 'qr' | 'ens' | 'nfc' | 'pin'
  settlementResult       // Bridge result {amount, fee, txHash, chain}
  pinData                // {pin, walletId, amount}
  balanceUSDC            // Current session balance
  // + legacy fields for festival mode
}
```

Buy and Claim pages use local step state machines:

```typescript
type BuyStep = 'select-asset' | 'insert-coins' | 'confirm-amount' | 'processing'
             | 'balance-confirmed' | 'choose-destination' | 'qr-scan' | 'ens-input'
             | 'select-chain' | 'settling' | 'done' | 'pin-generated'
```

---

## Mock API Layer

All async operations go through `lib/mock.ts` — shaped to match the [Ki0xk backend](https://github.com/Ki0xk/kiosk) return types for seamless future integration:

| Function | Simulates | Returns |
|----------|-----------|---------|
| `mockStartSession()` | Opening Yellow channel | `{sessionId, channelId}` |
| `mockDepositToSession()` | Recording coin insert | `{newBalance, totalDeposited}` |
| `mockEndSession()` | Yellow close + Arc bridge | `{settledAmount, fee, bridgeTxHash}` |
| `mockSessionToPin()` | PIN wallet creation | `{pin, walletId, amount}` |
| `mockLookupPinWallet()` | PIN wallet lookup | `{amount}` |
| `mockClaimPinWallet()` | Claim + bridge | `{amount, bridgeResult}` |
| `simulateCoinInsert()` | Arduino JSON event | `{type:'coin', pulses, value}` |

---

## Constants

Derived from the [Ki0xk backend](https://github.com/Ki0xk/kiosk):

```
Coin Denominations (from Arduino Coinslot):
  1-2 pulses  → 1 peso  → $0.01 USDC
  5-10 pulses → 2 pesos → $0.02 USDC
  11-16 pulses → 5 pesos → $0.05 USDC

Fee Rate: 0.001% (FEE_RATE = 0.00001)

Wallet ID: 6 alphanumeric chars (0-9 + A-D)
PIN: 6 numeric digits (0-9)

Supported Chains (via Arc Bridge CCTP):
  Base Sepolia, Ethereum Sepolia, Arbitrum Sepolia,
  Polygon Amoy, Optimism Sepolia, Avalanche Fuji, Linea Sepolia
```

---

## Design System

### Color Palette

| Token | Hex | Role |
|-------|-----|------|
| `--holo-gold` | `#ffd700` | Primary actions, headings, PIN display |
| `--holo-cyan` | `#78ffd6` | Accent, success, coin totals |
| `--holo-purple` | `#667eea` | Secondary, focus, wallet ID display |
| `--holo-deep-purple` | `#764ba2` | Gradients |
| `--holo-pink` | `#f093fb` | Decorative gradients, fees |
| `--background` | `#0a0a1a` | Dark navy page background |
| `--card` | `#0f0f24` | Panel backgrounds |
| `--border` | `#2a2a4a` | Dividers, inactive borders |
| `--muted-foreground` | `#7a7a9a` | Secondary text, labels |
| `--foreground` | `#e0e8f0` | Primary text |

### Visual Effects (CSS classes)

| Class | Effect |
|-------|--------|
| `.scanlines` | CRT monitor horizontal line overlay |
| `.pixel-grid` | 16px grid background pattern |
| `.pixel-border` | Multi-layer inset/outset shadow border |
| `.holo-border` | 5-color gradient border image |
| `.holo-shimmer` | Subtle holographic background gradient |
| `.holo-sweep` | Animated gradient sweep (3s loop) |
| `.tilt-warning` | Red tilting animation for PIN warning |
| `.glow-*` | Box-shadow glows (gold, cyan, purple, pink) |
| `.text-glow-*` | Text-shadow glows (gold, cyan, purple, pink) |
| `.coin-animation` | Falling coin keyframe (0.8s) |
| `.nfc-pulse` | Breathing scale animation (1.5s loop) |
| `.touch-active` | Scale down on `:active` for touch feedback |

### Layout

The app renders inside a `PixelFrame` constrained to `max-w-2xl`, `aspect-[3/4]` (portrait tablet), and `max-h-[90vh]`. The `OnScreenKeyboard` uses a wide rectangle layout (`max-w-2xl`) optimized for landscape tablet touchscreen.

---

## Backend Integration

This UI is designed to pair with the [Ki0xk Kiosk backend](https://github.com/Ki0xk/kiosk). Currently all operations use mock functions (`lib/mock.ts`). To connect to the real backend:

1. Replace `mock*` calls with HTTP/WebSocket calls to the backend
2. Mock return shapes already match backend types — no UI changes needed
3. Connect `CoinSlotSimulator` to real Arduino serial events via WebSocket
4. QR scanner already validates Ethereum addresses and ENS names

---

## Project Structure

```
ki0xk-payment-kiosk/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── globals.css                 # Theme, animations, effects
│   └── app/
│       ├── kiosk/
│       │   ├── page.tsx            # Kiosk menu (Buy Crypto / I Have a PIN)
│       │   ├── buy/page.tsx        # Buy Crypto flow (12-step)
│       │   └── claim/page.tsx      # Claim PIN flow (9-step)
│       └── festival/               # Festival mode (unchanged)
├── components/
│   ├── ki0xk/                      # Custom kiosk components
│   └── ui/                         # shadcn/ui components
├── lib/
│   ├── constants.ts                # Coins, chains, fees, wallet ID config
│   ├── state.tsx                   # Global state provider + reducer
│   └── mock.ts                     # Mock API (backend-shaped returns)
└── styles/
    └── globals.css                 # shadcn/ui base theme
```

---

## Hackathon

Part of **Ki0xk**, built for HackMoney.

| Sponsor | Integration | Purpose |
|---------|-------------|---------|
| **Yellow Network** | Nitrolite state channels | Session-based off-chain accounting |
| **Circle Arc** | Bridge Kit / CCTP | Cross-chain USDC settlement to 7 chains |
| **ENS** | On-screen keyboard + resolution | Human-readable wallet addresses |

---

## License

Apache-2.0
