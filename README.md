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
       │                     │                         │
   Arduino             Arc Bridge               Destination
   Coinslot         (Circle CCTP)               Wallet/PIN
```

The kiosk operator pre-funds an Arc wallet with USDC. Users insert physical coins, provide a destination (QR/ENS/PIN), and receive real USDC on their chosen chain via Circle CCTP bridge.

### Two Paths

**Path A — "I have a wallet"**: Insert coins, scan QR or type ENS, select chain, receive USDC on-chain. Done in ~20 seconds.

**Path B — "No wallet yet"**: Insert coins, get a PIN + Wallet ID receipt. Come back later with a wallet to claim.

### Buy Crypto Flow

| Step | Screen | Action |
|------|--------|--------|
| 1 | Select Asset | Choose USDC |
| 2 | Insert Coins | Tap coin buttons (demo) or insert real coins (Arduino) |
| 3 | Confirm Amount | Review fee breakdown (0.001%) |
| 4 | Choose Destination | QR scan, ENS name, NFC (coming soon), or Print PIN |
| 5 | Select Chain | Pick from 7 testnets (Base, Ethereum, Arbitrum, Polygon, Optimism, Avalanche, Linea) |
| 6 | Settling | Bridge real USDC via Circle Arc CCTP (~15s) |
| 7 | Done | Receipt with TX hash + QR code linking to block explorer |

### Claim PIN Flow

| Step | Screen | Action |
|------|--------|--------|
| 1 | Enter PIN | 6-digit PIN from receipt |
| 2 | Enter Wallet ID | 6-character alphanumeric code (0-9 + A-D) |
| 3 | Show Balance | Display stored USDC amount |
| 4 | Choose Destination | QR scan or ENS name |
| 5 | Select Chain | Pick destination network |
| 6 | Settling | Bridge real USDC via Circle Arc CCTP |
| 7 | Done | Receipt with TX hash + QR code for on-chain verification |

**No KYC. No gas fees. No seed phrases. No waiting.**

---

## Quick Start

```bash
# Install
pnpm install

# Configure
cp .env.example .env.local
# Edit .env.local — add your PRIVATE_KEY (funded on Arc Testnet)

# Run
pnpm dev          # http://localhost:3000
pnpm build        # Production build
pnpm lint         # ESLint
```

### Environment Variables

| Variable | Side | Required | Description |
|----------|------|----------|-------------|
| `NEXT_PUBLIC_MODE` | Client | Yes | `demo_online` (UI coins), `demo_kiosk` (Arduino), `demo_festival` (Arduino+NFC) |
| `PRIVATE_KEY` | Server | Yes | Kiosk wallet private key (funded on Arc Testnet with USDC) |
| `CHAIN_ID` | Server | No | Default: `84532` (Base Sepolia) |
| `RPC_URL` | Server | No | Default: `https://sepolia.base.org` |
| `CLEARNODE_WS_URL` | Server | No | Default: `wss://clearnet-sandbox.yellow.com/ws` |
| `USDC_ADDRESS` | Server | No | Default: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| `FEE_RECIPIENT_ADDRESS` | Server | No | Optional fee collection address |
| `SERIAL_PORT` | Server | No | Arduino serial port (default: `/dev/ttyUSB0`) |
| `SERIAL_BAUD` | Server | No | Baud rate (default: `115200`) |
| `LOG_LEVEL` | Server | No | `debug`, `info`, `warn`, `error` |

### Testnet Faucet

Fund your kiosk wallet on Arc Testnet:

```bash
curl -XPOST https://clearnet-sandbox.yellow.com/faucet/requestTokens \
  -H "Content-Type: application/json" \
  -d '{"userAddress":"YOUR_WALLET_ADDRESS"}'
```

---

## Demo Modes

| Mode | Coin Input | Transfers | NFC | Deploy Target |
|------|-----------|-----------|-----|---------------|
| `demo_online` | UI buttons (CoinSlotSimulator) | Real USDC via Arc Bridge | Mock | Vercel / any host |
| `demo_kiosk` | Arduino serial (hardware coins) | Real USDC via Arc Bridge | Mock | Local PC + tablet |
| `demo_festival` | Arduino serial (hardware coins) | Real USDC via Arc Bridge | Real | Local PC + tablet |

All three modes perform **real USDC transfers** via Circle CCTP. Only the input method changes.

---

## Architecture

### Settlement Flow

```
Coins → Local Session → Arc Bridge (Circle CCTP) → USDC on destination chain
                            │
                       approve → burn → fetchAttestation → mint
                            │
                       ~15 seconds end-to-end
```

Sessions are local records (in-memory + file persistence). No Yellow Network channels are created — the kiosk uses its pre-funded Arc wallet to bridge USDC directly to the user's destination address.

### ENS Resolution

ENS names (e.g. `yourname.eth`) are resolved server-side via viem on Ethereum mainnet before being passed to the bridge. The QR scanner and on-screen keyboard both accept ENS names and hex addresses.

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/session/start` | POST | Create local session |
| `/api/session/deposit` | POST | Record coin insertion (local balance tracking) |
| `/api/session/end` | POST | Resolve ENS + bridge USDC via Arc CCTP |
| `/api/session/pin` | POST | Create PIN wallet from session balance |
| `/api/pin/lookup` | POST | Verify PIN + wallet ID, return balance |
| `/api/pin/claim` | POST | Claim PIN wallet — bridge USDC to destination |
| `/api/hardware/coin/connect` | POST | Open Arduino serial port |
| `/api/hardware/coin/events` | GET | SSE stream of coin events from Arduino |
| `/api/status` | GET | System status (mode, wallet, serial, sessions) |

### Server Modules (`lib/server/`)

| Module | Source | Purpose |
|--------|--------|---------|
| `config.ts` | Adapted from `kiosk/src/config.ts` | Zod-validated env vars, lazy singleton |
| `logger.ts` | Adapted from `kiosk/src/logger.ts` | BigInt-safe JSON, respects LOG_LEVEL |
| `session.ts` | Adapted from `kiosk/src/session.ts` | Session lifecycle (local records, no channels) |
| `settlement.ts` | Adapted from `kiosk/src/settlement.ts` | PIN wallets, claim + bridge |
| `ens.ts` | New | ENS resolution via viem on Ethereum mainnet |
| `serial.ts` | New | Arduino serial reader (dynamic import, SSR-safe) |
| `arc/bridge.ts` | Adapted from `kiosk/src/arc/bridge.ts` | Circle CCTP bridge via `@circle-fin/bridge-kit` |
| `arc/chains.ts` | Adapted from `kiosk/src/arc/chains.ts` | 7 supported testnet chains |
| `arc/fees.ts` | Adapted from `kiosk/src/arc/fees.ts` | Fee calculation (0.001%) |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16, React 19, TypeScript 5 |
| Styling | Tailwind CSS v4, CSS custom properties, custom keyframes |
| UI Components | shadcn/ui (New York style), Radix UI primitives, Lucide icons |
| State | React Context + `useReducer` (`lib/state.tsx`) |
| Bridge | `@circle-fin/bridge-kit` + `@circle-fin/adapter-viem-v2` (Circle CCTP) |
| ENS | viem `getEnsAddress` + `normalize` on Ethereum mainnet |
| QR Code | html5-qrcode (scanner), qrcode.react (display) |
| Serial | serialport + @serialport/parser-readline (dynamic import) |
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
| `/app/kiosk/buy` | Buy Crypto flow |
| `/app/kiosk/claim` | Claim PIN flow |

### Festival Mode (Wristband Payments)

| Route | Purpose |
|-------|---------|
| `/app/festival` | Festival mode selector — Admin or Public |
| `/app/festival/admin` | Load NFC cards via PIN (demo: `1234`) |
| `/app/festival/public` | Pay vendors or recharge balance |

---

## Components

### Kiosk Components (`components/ki0xk/`)

| Component | Description |
|-----------|-------------|
| `CoinSlotSimulator` | Three coin buttons (1/2/5 pesos) in `demo_online`; "INSERT COIN" waiting indicator with Arduino status in `demo_kiosk`/`demo_festival` |
| `OnScreenKeyboard` | Full QWERTY + numbers for tablet. CAPS toggle, `.eth` shortcut, `0x` prefix, backspace. Wide rectangle layout |
| `ChainSelector` | Vertical list of 7 testnet chains with radio selection |
| `QrScanner` | Camera QR reader via html5-qrcode. Validates Ethereum addresses and ENS names |
| `PinDisplay` | 6-digit PIN in gold boxes, 6-char wallet ID in purple boxes, tilting "save this PIN" warning |
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
  sessionId              // Local session ID
  totalDepositedPesos    // Cash inserted
  totalDepositedUSDC     // Converted value
  coinInsertions[]       // Each coin event {pesos, usdc, timestamp}
  destinationAddress     // QR/ENS destination
  destinationChain       // Selected chain key
  destinationMethod      // 'qr' | 'ens' | 'nfc' | 'pin'
  settlementResult       // Bridge result {amount, fee, txHash, explorerUrl, chain}
  pinData                // {pin, walletId, amount}
  balanceUSDC            // Current session balance
}
```

---

## Constants

```
Coin Denominations (from Arduino Coinslot):
  1-2 pulses  → 1 peso  → $0.01 USDC
  5-10 pulses → 2 pesos → $0.02 USDC
  11-16 pulses → 5 pesos → $0.05 USDC

Fee Rate: 0.001% (FEE_RATE = 0.00001)

Wallet ID: 6 alphanumeric chars (0-9 + A-D) — physical keypad compatible
PIN: 6 numeric digits (0-9)

Supported Chains (via Arc Bridge CCTP):
  Base Sepolia, Ethereum Sepolia, Arbitrum Sepolia,
  Polygon Amoy, Optimism Sepolia, Avalanche Fuji, Linea Sepolia
```

---

## Project Structure

```
ki0xk-payment-kiosk/
├── app/
│   ├── page.tsx                          # Landing page
│   ├── globals.css                       # Theme, animations, effects
│   ├── api/
│   │   ├── session/
│   │   │   ├── start/route.ts            # POST — create session
│   │   │   ├── deposit/route.ts          # POST — record coin insert
│   │   │   ├── end/route.ts              # POST — bridge USDC to destination
│   │   │   └── pin/route.ts              # POST — create PIN wallet
│   │   ├── pin/
│   │   │   ├── lookup/route.ts           # POST — verify PIN + wallet ID
│   │   │   └── claim/route.ts            # POST — claim PIN → bridge USDC
│   │   ├── hardware/coin/
│   │   │   ├── connect/route.ts          # POST — open Arduino serial port
│   │   │   └── events/route.ts           # GET  — SSE coin event stream
│   │   └── status/route.ts               # GET  — system status
│   └── app/
│       ├── kiosk/
│       │   ├── page.tsx                  # Kiosk menu
│       │   ├── buy/page.tsx              # Buy Crypto flow
│       │   └── claim/page.tsx            # Claim PIN flow
│       └── festival/                     # Festival mode
├── components/
│   ├── ki0xk/                            # Custom kiosk components
│   └── ui/                              # shadcn/ui components
├── hooks/
│   ├── use-coin-events.ts               # SSE hook for Arduino coin events
│   └── use-serial-status.ts             # Serial port connection status
├── lib/
│   ├── api-client.ts                    # Client-side fetch wrappers for API routes
│   ├── constants.ts                     # Coins, chains, fees, wallet ID config
│   ├── mode.ts                          # Demo mode detection + feature flags
│   ├── state.tsx                        # Global state provider + reducer
│   ├── mock.ts                          # Mock API (retained as reference)
│   └── server/
│       ├── config.ts                    # Zod-validated server config
│       ├── logger.ts                    # Structured logger
│       ├── session.ts                   # Session lifecycle
│       ├── settlement.ts               # PIN wallets + claim
│       ├── ens.ts                       # ENS resolution via viem
│       ├── serial.ts                    # Arduino serial reader
│       └── arc/
│           ├── bridge.ts               # Circle CCTP bridge
│           ├── chains.ts               # Supported chain definitions
│           └── fees.ts                 # Fee calculation
└── .env.example                         # Environment template
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

## Hackathon

Part of **Ki0xk**, built for HackMoney.

| Sponsor | Integration | Purpose |
|---------|-------------|---------|
| **Yellow Network** | ClearNode (unified balance) | Kiosk wallet management + off-chain accounting |
| **Circle Arc** | Bridge Kit / CCTP | Cross-chain USDC settlement to 7 chains |
| **ENS** | viem resolution + on-screen keyboard | Human-readable wallet addresses |

---

## License

Apache-2.0
