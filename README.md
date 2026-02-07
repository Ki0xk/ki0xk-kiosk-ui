# Ki0xk Payment Kiosk

Physical crypto payment infrastructure for events, festivals, retail, and temporary venues. Bridges cash input to instant USDC delivery on any EVM chain.

Built with Next.js 16, React 19, Tailwind CSS v4, and shadcn/ui. Retro arcade aesthetic with holographic glows, scanlines, and pixel art styling.

> Cash in, crypto out. No wallet needed.

---

## What It Does

Ki0xk turns physical coins into USDC on any blockchain. The operator pre-funds a wallet with USDC, and the system handles everything — coin acceptance, off-chain accounting, cross-chain bridging, and NFC wristband payments.

```
                    ┌─────────────────────────────────────────────────┐
                    │              Ki0xk Payment Kiosk                 │
                    │         (Next.js 16 + React 19 + NFC)           │
                    └─────────┬──────────────────┬────────────────────┘
                              │                  │
               ┌──────────────▼──────┐  ┌───────▼──────────────────┐
               │   ATM MODE          │  │   FESTIVAL MODE           │
               │   Cash → USDC       │  │   NFC Wristband Payments  │
               └──────────┬──────────┘  └───────┬──────────────────┘
                          │                      │
         ┌────────────────▼──────┐    ┌──────────▼─────────────────┐
         │  Yellow Network       │    │  Circle Gateway             │
         │  Off-chain accounting │    │  Cross-chain merchant       │
         │  + Arc Bridge (CCTP)  │    │  payouts (burn → mint)      │
         │  for USDC delivery    │    │  + just-in-time funding     │
         └───────────────────────┘    └────────────────────────────┘
```

---

## Hackathon Integrations

### Yellow Network — Off-Chain Session Accounting

Ki0xk uses the **Yellow SDK** to manage a unified off-chain balance for the kiosk operator. When users insert coins, the system tracks balances through Yellow Network's ClearNode — instant, gasless, and session-based.

**How we use it:**
- **ClearNode WebSocket** connection for real-time balance tracking (`wss://clearnet-sandbox.yellow.com/ws`)
- **EIP-712 authenticated sessions** — main wallet signs a challenge, ephemeral session key handles subsequent operations
- **Unified balance** model (no channels) — the kiosk operator deposits once, serves unlimited users
- **`ytest.usd` asset** on sandbox for off-chain USDC accounting
- **Ledger balance** queries to verify operator has sufficient funds before accepting coins

The Yellow integration provides the speed of Web2 with Web3 security — users don't wait for blockchain confirmations when inserting coins. Final settlement happens via Arc Bridge when the user withdraws.

**Key files:** `lib/server/clearnode.ts`, `lib/server/session.ts`, `lib/server/settlement.ts`

### Circle Arc — Cross-Chain USDC Delivery

Ki0xk uses **Circle's Arc testnet** as the settlement layer and **two different Circle tools** depending on the mode:

**ATM Mode — Arc Bridge (CCTP):**
- `@circle-fin/bridge-kit` for cross-chain USDC transfers
- Flow: `approve → burn → fetchAttestation → mint` on 7 destination chains
- ~15 second end-to-end settlement
- Users choose their preferred chain (Base, Ethereum, Arbitrum, Polygon, Optimism, Avalanche, Linea)

**Festival Mode — Circle Gateway:**
- EIP-712 signed `BurnIntent` + `TransferSpec` for merchant payouts
- Gateway API (`gateway-api-testnet.circle.com/v1`) handles attestation
- On-chain `gatewayMint()` on destination chain (GatewayMinter contract)
- **Just-in-time funding**: auto-deposits Arc USDC into GatewayWallet before each transfer
- Supports 7 destination chains (Base Sepolia, Ethereum Sepolia, Avalanche Fuji, Sonic, Sei, HyperEVM, Arc)

**Contract addresses (same on all testnet chains):**
- GatewayWallet: `0x0077777d7EBA4688BDeF3E311b846F25870A19B9`
- GatewayMinter: `0x0022222ABE238Cc2C7Bb1f21003F0a260052475B`

**Key files:** `lib/server/arc/bridge.ts`, `lib/server/gateway/index.ts`, `lib/server/gateway/chains.ts`

### ENS — Human-Readable Wallet Addresses

Ki0xk resolves **ENS names** (e.g. `yourname.eth`) server-side via viem's `getEnsAddress` + `normalize` on Ethereum mainnet. Users can type or scan an ENS name instead of a hex address — the system resolves it before bridging USDC.

**How we use it:**
- On-screen keyboard with `.eth` shortcut button for quick ENS entry
- QR scanner accepts both hex addresses and ENS names
- Server-side resolution via `lib/server/ens.ts` before passing to the bridge
- Works in both ATM mode (CCTP bridge) and claim flow

**Key files:** `lib/server/ens.ts`

---

## Two Operating Modes

### ATM Mode — Cash to Crypto

Users insert physical coins and receive USDC on their preferred chain.

**Path A — "I have a wallet":** Insert coins → scan QR or type ENS → select chain → receive USDC on-chain (~20s).

**Path B — "No wallet yet":** Insert coins → get a PIN + Wallet ID receipt → come back later with a wallet to claim.

```
Arduino Coinslot  →  Yellow Network (off-chain balance)  →  Arc Bridge (CCTP)  →  USDC on destination
```

### Festival Mode — NFC Wristband Payments

Cashless payments at events using NFC wristbands/cards. Three flows:

**Admin top-up (cashier):** Enter amount → tap NFC card → new card: set PIN → balance loaded. Existing card: balance added directly.

**Self-service top-up:** Insert coins (Arduino coinslot) → tap NFC card → balance added.

**Merchant payment:** Select merchant → build cart (preset products) → tap NFC card → enter PIN → confirm → Circle Gateway burn+mint → USDC delivered to merchant wallet.

```
NFC Card (UID)  →  Festival Card (server)  →  Circle Gateway (burn)  →  Merchant wallet (mint)
```

**NFC card stores:** Only the hardware UID (no NDEF write needed — works with any NFC card/tag including MIFARE Classic).

**Festival cards:** Server-side balance tracking with SHA-256 PIN hashing. Card UID = wallet ID.

**Merchant payouts:** Real USDC delivered via Circle Gateway to merchant's preferred chain.

---

## Quick Start

```bash
# Install
pnpm install

# Configure
cp .env.example .env.local
# Edit .env.local — add your PRIVATE_KEY (funded on Arc Testnet)

# Run
NEXT_PUBLIC_MODE=demo_online pnpm dev     # UI coins, no hardware
NEXT_PUBLIC_MODE=demo_kiosk pnpm dev      # Arduino coins
NEXT_PUBLIC_MODE=demo_festival pnpm dev   # Arduino + NFC + Gateway
```

### Environment Variables

| Variable | Side | Required | Description |
|----------|------|----------|-------------|
| `NEXT_PUBLIC_MODE` | Client | Yes | `demo_online`, `demo_kiosk`, or `demo_festival` |
| `PRIVATE_KEY` | Server | Yes | Kiosk wallet private key (funded on Arc Testnet with USDC) |
| `CLEARNODE_WS_URL` | Server | No | Default: `wss://clearnet-sandbox.yellow.com/ws` |
| `CIRCLE_API_KEY` | Server | No | Circle API key for Arc faucet auto-funding |
| `FESTIVAL_ADMIN_PIN` | Server | No | Admin PIN for festival mode (default: `1234`) |
| `GATEWAY_API_URL` | Server | No | Default: `https://gateway-api-testnet.circle.com/v1` |
| `MERCHANT_BEERS_ADDRESS` | Server | No | Merchant wallet address for beers vendor |
| `MERCHANT_BEERS_CHAIN` | Server | No | Default: `base_sepolia` |
| `MERCHANT_FOOD_ADDRESS` | Server | No | Merchant wallet address for food vendor |
| `MERCHANT_FOOD_CHAIN` | Server | No | Default: `base_sepolia` |
| `MERCHANT_MERCH_ADDRESS` | Server | No | Merchant wallet address for merch vendor |
| `MERCHANT_MERCH_CHAIN` | Server | No | Default: `base_sepolia` |
| `SERIAL_PORT` | Server | No | Arduino serial port (default: `/dev/ttyUSB0`) |
| `SERIAL_BAUD` | Server | No | Baud rate (default: `115200`) |
| `LOG_LEVEL` | Server | No | `debug`, `info`, `warn`, `error` |

### Testnet Faucets

```bash
# Yellow Network faucet (ytest.usd)
curl -XPOST https://clearnet-sandbox.yellow.com/faucet/requestTokens \
  -H "Content-Type: application/json" \
  -d '{"userAddress":"YOUR_WALLET_ADDRESS"}'

# Circle Arc faucet (USDC on Arc Testnet) — requires CIRCLE_API_KEY
# Auto-claimed on startup if balance < 1 USDC
```

---

## NFC Reader Setup (Linux)

Festival mode requires a USB NFC reader (tested with ACR122U). Install the PC/SC stack:

```bash
# 1. Install PC/SC daemon and development libraries
sudo apt install pcscd libpcsclite-dev libpcsclite1 pcsc-tools

# 2. Install build tools (needed for nfc-pcsc native module)
sudo apt install build-essential python3
npm install -g node-gyp

# 3. Blacklist kernel NFC modules (they conflict with PC/SC)
sudo sh -c 'echo -e "blacklist pn533\nblacklist pn533_usb\nblacklist nfc" > /etc/modprobe.d/blacklist-nfc.conf'
sudo modprobe -r pn533_usb pn533 nfc 2>/dev/null

# 4. Start PC/SC daemon
sudo systemctl start pcscd.socket pcscd.service

# 5. Verify reader is detected (plug in USB NFC reader first)
pcsc_scan
# Should show: "ACS ACR122U PICC Interface" or similar

# 6. Rebuild native modules
cd ki0xk-payment-kiosk && pnpm rebuild
```

**Troubleshooting:**
- If `pcsc_scan` shows "Waiting for the first reader": check kernel NFC modules are blacklisted, try `sudo systemctl stop pcscd.socket pcscd.service && sudo systemctl start pcscd.socket pcscd.service`
- If `pcsc_scan` shows "Service not available": restart both `pcscd.socket` and `pcscd.service`
- The reader works with any NFC card/tag — MIFARE Classic, NTAG, DESFire, etc. The card's hardware UID is used as the identifier

---

## Demo Modes

| Mode | Coin Input | Transfers | NFC | Gateway | Deploy Target |
|------|-----------|-----------|-----|---------|---------------|
| `demo_online` | UI buttons | Real USDC via Arc Bridge | No | No | Vercel / any host |
| `demo_kiosk` | Arduino serial | Real USDC via Arc Bridge | No | No | Local PC + tablet |
| `demo_festival` | Arduino serial | Real USDC via Gateway | Yes | Yes | Local PC + tablet |

All modes perform **real USDC transfers**. Only the input method and settlement path change.

---

## API Routes

### ATM (Session-based)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/session/start` | POST | Create local session |
| `/api/session/deposit` | POST | Record coin insertion |
| `/api/session/end` | POST | Resolve ENS + bridge USDC via Arc CCTP |
| `/api/session/pin` | POST | Create PIN wallet from session balance |
| `/api/pin/lookup` | POST | Verify PIN + wallet ID, return balance |
| `/api/pin/claim` | POST | Claim PIN wallet — bridge USDC to destination |

### Festival (NFC + Gateway)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/festival/card` | POST | Card CRUD (create, set-pin, balance, topup, info, summary) |
| `/api/festival/pay` | POST | Payment: verify PIN → deduct → Gateway burn+mint |
| `/api/festival/merchants` | GET | List merchants from env config |
| `/api/festival/admin/verify-pin` | POST | Verify admin PIN |
| `/api/festival/gateway/balance` | GET | Check Gateway unified balance |
| `/api/festival/gateway/deposit` | POST | Pre-fund Gateway with Arc USDC |

### Hardware

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/hardware/coin/connect` | POST | Open Arduino serial port |
| `/api/hardware/coin/events` | GET | SSE stream of coin events |
| `/api/hardware/nfc/connect` | POST | Connect NFC PC/SC reader |
| `/api/hardware/nfc/events` | GET | SSE stream of NFC tap events |
| `/api/hardware/nfc/write` | POST | Write NDEF to NFC card |

### System

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/status` | GET | System status + auto-fund on startup |
| `/api/faucet` | GET/POST | Balance check / faucet claim |

---

## Architecture

### ATM Settlement Flow

```
Coins → Local Session (Yellow off-chain) → Arc Bridge (CCTP) → USDC on destination chain
                                                │
                                           approve → burn → attest → mint
                                                │
                                           ~15 seconds end-to-end
```

### Festival Payment Flow

```
NFC Tap → Verify PIN → Deduct Card → Ensure Gateway Balance → Transfer → Mint
                                           │                      │          │
                                     (auto-deposit           (EIP-712   (on-chain
                                      if needed)              burn)      mint)
```

### ENS Resolution

ENS names (e.g. `yourname.eth`) are resolved server-side via viem on Ethereum mainnet before being passed to the bridge. The QR scanner and on-screen keyboard both accept ENS names and hex addresses.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16, React 19, TypeScript 5 |
| Styling | Tailwind CSS v4, CSS custom properties |
| UI | shadcn/ui (New York), Radix UI, Lucide icons |
| State | React Context + `useReducer` |
| Yellow Network | ClearNode WebSocket, EIP-712 auth, unified balance |
| Arc Bridge | `@circle-fin/bridge-kit` + `@circle-fin/adapter-viem-v2` (CCTP) |
| Circle Gateway | EIP-712 BurnIntent, Gateway API, GatewayMinter contract |
| ENS | viem `getEnsAddress` + `normalize` on Ethereum mainnet |
| NFC | `nfc-pcsc` (PC/SC smart card interface) |
| QR Code | html5-qrcode (scanner), qrcode.react (display) |
| Serial | serialport + @serialport/parser-readline |
| Font | Press Start 2P (Google Fonts) |

---

## Project Structure

```
ki0xk-payment-kiosk/
├── app/
│   ├── api/
│   │   ├── session/                      # ATM session routes
│   │   ├── pin/                          # PIN wallet routes
│   │   ├── festival/
│   │   │   ├── card/route.ts             # Card CRUD + top-up
│   │   │   ├── pay/route.ts              # Gateway payment
│   │   │   ├── merchants/route.ts        # Merchant list
│   │   │   ├── admin/verify-pin/route.ts # Admin auth
│   │   │   └── gateway/                  # Gateway balance + deposit
│   │   ├── hardware/
│   │   │   ├── coin/                     # Arduino serial
│   │   │   └── nfc/                      # NFC PC/SC
│   │   ├── faucet/route.ts               # Balance + faucet
│   │   └── status/route.ts               # System status
│   └── app/
│       ├── kiosk/                        # ATM mode pages
│       └── festival/                     # Festival mode pages
├── components/ki0xk/                     # Custom kiosk components
├── hooks/
│   ├── use-coin-events.ts                # SSE hook for Arduino
│   └── use-nfc-events.ts                 # SSE hook for NFC taps
├── lib/
│   ├── api-client.ts                     # Client-side API wrappers
│   ├── constants.ts                      # Chains, products, fees
│   ├── mode.ts                           # Demo mode + feature flags
│   ├── state.tsx                         # Global state provider
│   └── server/
│       ├── clearnode.ts                  # Yellow Network ClearNode client
│       ├── session.ts                    # Session lifecycle
│       ├── settlement.ts                 # PIN wallets + claim
│       ├── festival-cards.ts             # NFC card balance tracking
│       ├── festival-payment.ts           # Payment orchestrator
│       ├── merchants.ts                  # Env-based merchant config
│       ├── nfc.ts                        # NFC PC/SC manager
│       ├── serial.ts                     # Arduino serial reader
│       ├── ens.ts                        # ENS resolution
│       ├── faucet.ts                     # Auto-fund + faucet claims
│       ├── gateway/
│       │   ├── index.ts                  # Gateway deposit/transfer/mint
│       │   └── chains.ts                 # Gateway chain definitions
│       └── arc/
│           ├── bridge.ts                 # Circle CCTP bridge
│           ├── chains.ts                 # Supported chains
│           └── fees.ts                   # Fee calculation
└── .env.example                          # Environment template
```

---

## Hackathon

Part of **Ki0xk**, built for [HackMoney](https://hackmoney.ethglobal.com/).

| Sponsor | Integration | How We Use It |
|---------|-------------|---------------|
| **Yellow Network** | ClearNode SDK, unified balance, EIP-712 sessions | Off-chain USDC accounting for ATM — instant, gasless session-based transfers that settle on-chain when users withdraw |
| **Circle / Arc** | Arc Bridge (CCTP), Circle Gateway, Arc Testnet | ATM: cross-chain USDC delivery via CCTP to 7 chains. Festival: merchant payouts via Gateway EIP-712 burn+mint with just-in-time funding |
| **ENS** | viem `getEnsAddress` + `normalize` | Human-readable wallet addresses — users type `name.eth` instead of hex addresses, resolved server-side on Ethereum mainnet |

---

## License

Apache-2.0
