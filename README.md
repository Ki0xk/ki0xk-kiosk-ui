# Ki0xk Payment Kiosk

Physical crypto payment infrastructure for events, festivals, retail, and temporary venues. Bridges cash input to instant USDC delivery on any EVM chain.

Built with Next.js 16, React 19, Tailwind CSS v4, and shadcn/ui. Retro arcade aesthetic with holographic glows, scanlines, and pixel art styling.

> Cash in, crypto out. Any NFC card becomes a wallet.

---

## What It Does

Ki0xk turns physical coins into USDC on any blockchain — and turns **any NFC chip** into a crypto wallet. Metro cards, ETHGlobal wristbands, NFC stickers, ID badges, or even your phone — tap it once, set a PIN, and you have a reusable USDC wallet you can top up and withdraw from at any kiosk.

The operator pre-funds a wallet with USDC, and the system handles everything — coin acceptance, off-chain accounting, cross-chain bridging, NFC card wallets, and festival wristband payments.

```
                    ┌─────────────────────────────────────────────────┐
                    │              Ki0xk Payment Kiosk                 │
                    │         (Next.js 16 + React 19 + NFC)           │
                    └─────────┬──────────────────┬────────────────────┘
                              │                  │
               ┌──────────────▼──────┐  ┌───────▼──────────────────┐
               │   ATM / KIOSK MODE  │  │   FESTIVAL MODE           │
               │   Cash → USDC       │  │   NFC Wristband Payments  │
               │   NFC Card Wallets  │  │   Merchant Cart + Gateway │
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

## NFC Card Wallets — Any NFC Chip Is a Crypto Wallet

The killer feature: **any NFC-enabled object** becomes a reusable crypto wallet. No app, no account, no KYC.

**How it works:**
1. User inserts coins at a kiosk → chooses "Save to NFC Card"
2. Taps any NFC card/chip near the reader — the card's hardware UID is read
3. First time? Set a 4-digit PIN. Returning? Balance tops up automatically
4. Done. The card now holds USDC balance — protected by the user's PIN

**What works as a wallet:**
- Metro / subway / transport cards
- ETHGlobal wristbands and conference badges
- NFC stickers (stick one on your phone case)
- Any MIFARE Classic, NTAG, DESFire, or NFC-enabled card
- Android phones (via Web NFC API in online demo mode)

**The card stores nothing** — only the hardware UID is read (no NDEF write). All balances and PINs are tracked server-side with SHA-256 hashing. Lost your card? Your balance is safe — the card alone is useless without the PIN.

**NFC Wallet features (kiosk mode):**
- **Check balance** — tap card → enter PIN → see balance, total loaded, total spent
- **Top up** — insert more coins → tap same card → balance increases
- **Withdraw** — tap card → enter PIN → scan QR or type ENS → receive USDC on any chain
- **Cross-kiosk** — cards work at any Ki0xk kiosk or festival using the same server

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
- Works in both ATM mode (CCTP bridge) and NFC wallet withdrawal

**Key files:** `lib/server/ens.ts`

---

## Three Operating Modes

### Kiosk / ATM Mode — Cash to Crypto + NFC Wallets

Users insert physical coins and either receive USDC on their preferred chain or save it to an NFC card wallet.

**Path A — "Send to my wallet":** Insert coins → scan QR or type ENS → select chain → receive USDC on-chain (~20s).

**Path B — "Save to NFC card":** Insert coins → tap any NFC card → set PIN (first time only) → balance saved. Come back anytime to top up or withdraw.

**Path C — "Print a PIN":** Insert coins → get a PIN + Wallet ID receipt → come back later with a wallet to claim.

**Path D — "NFC Wallet":** Tap existing NFC card → enter PIN → check balance → optionally withdraw to any chain.

```
Arduino Coinslot  →  Yellow Network (off-chain balance)  →  Arc Bridge (CCTP)  →  USDC on destination
                                                         →  NFC Card (local balance + PIN)
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

### Online Demo Mode

Same features as kiosk mode but with simulated coin insertion (UI buttons instead of Arduino serial). Web NFC API enables phone-based NFC on Android Chrome. Deployable to Vercel or any host.

---

## Quick Start

```bash
# Install
pnpm install

# Configure
cp .env.example .env.local
# Edit .env.local — add your PRIVATE_KEY (funded on Arc Testnet)

# Run
NEXT_PUBLIC_MODE=demo_online pnpm dev     # UI coins, phone NFC
NEXT_PUBLIC_MODE=demo_kiosk pnpm dev      # Arduino coins + USB NFC reader
NEXT_PUBLIC_MODE=demo_festival pnpm dev   # Arduino + NFC + Gateway merchants
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

The system auto-claims faucets on startup and every 2.5 hours if balances are low.

```bash
# Yellow Network faucet (ytest.usd) — auto-claimed
curl -XPOST https://clearnet-sandbox.yellow.com/faucet/requestTokens \
  -H "Content-Type: application/json" \
  -d '{"userAddress":"YOUR_WALLET_ADDRESS"}'

# Circle Arc faucet (USDC on Arc Testnet) — auto-claimed if CIRCLE_API_KEY is set
```

---

## NFC Reader Setup (Linux)

Kiosk and festival modes with USB NFC reader (tested with ACR122U). Install the PC/SC stack:

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

## DIY Kiosk Hardware Setup

Turn an Android tablet + a Linux mini-PC into a portable Ki0xk payment kiosk for local ATMs, festivals, pop-up events, hackathons, and offline-first deployments.

The design separates peripherals from logic — all trusted code runs on the mini-PC. The tablet is a dumb peripheral (screen, touch, camera).

> For hardware support, contact [@0xoucan](https://x.com/0xoucan)

### Architecture

```
Android Tablet (USB)
 ├─ Touch / Pen input     → Weylus (tablet as touchscreen)
 ├─ Front camera          → scrcpy → v4l2loopback → QR scanner
 └─ USB networking        → ADB reverse (localhost access)

Linux Mini-PC
 ├─ Ki0xk UI              → Firefox (kiosk mode) or Chromium
 ├─ NFC Reader            → USB PC/SC (pcscd)
 ├─ Coin Acceptor         → Arduino Uno (serial JSON)
 ├─ Off-chain accounting  → Yellow Network
 └─ On-chain settlement   → Circle Arc / Gateway
```

### Hardware Required

| Component | Notes |
|-----------|-------|
| Linux mini-PC (x86_64) | Ubuntu / Linux Mint recommended |
| Android tablet | USB, front camera |
| USB NFC reader | PC/SC compatible (e.g. ACR122U) |
| Arduino Uno | Or compatible board |
| Pulse-based coin acceptor | Electronic, pulse output |
| USB cables | Tablet, Arduino, NFC reader |
| **Dummy HDMI plug** | Display emulator for headless boots (critical for unattended reboots) |

### Software Prerequisites (Linux)

```bash
sudo apt update
sudo apt install -y \
  adb scrcpy v4l2loopback-dkms v4l-utils \
  pcscd pcsc-tools libpcsclite1 libpcsclite-dev
```

> `scrcpy` may require `snap install scrcpy` on some distros if not in apt.

### Android Tablet Setup

1. Enable Developer Options + USB Debugging
2. Connect tablet via USB, accept ADB RSA prompt
3. Verify: `adb devices` — should show `XXXXXXXX    device`

### NFC Reader

See [NFC Reader Setup (Linux)](#nfc-reader-setup-linux) above.

**Why not tablet NFC?**

| Method | Status | Reason |
|--------|--------|--------|
| Android Web NFC | Not used | Browser-limited, unreliable |
| Android native NFC | Not used | Requires custom app |
| USB NFC (PC/SC) | Used | Stable, kiosk-grade, works with any card |

### Arduino Coinslot

Pulse-based electronic coin acceptor connected to an Arduino Uno. Emits JSON events over serial at 115200 baud.

Full firmware and wiring: [Ki0xk Coinslot repo](https://github.com/Ki0xk/Coinslot)

```
[ Coin Inserted ] → Coin Acceptor (pulse) → Arduino Uno (interrupt) → USB Serial → Ki0xk Backend
```

**Serial output:**
```json
{"type":"status","msg":"READY coin-pulse reader"}
{"type":"coin","pulses":1,"value":1,"ok":true}
{"type":"coin","pulses":7,"value":2,"ok":true}
{"type":"coin","pulses":13,"value":5,"ok":true}
```

**Wiring:** Coin acceptor pulse → Arduino Pin 2 (interrupt). Shared GND. Acceptor powered by external 5V adapter, Arduino via USB.

**Build & upload:**
```bash
cd Coinslot
pio run -e uno --target upload    # Build + upload
pio device monitor -b 115200      # Monitor serial
```

### Startup Script

Create `~/.local/bin/ki0xk-startup.sh` and add to Startup Applications (`bash -lc "$HOME/.local/bin/ki0xk-startup.sh"`):

```bash
#!/bin/bash
set -euo pipefail

sleep 15  # Wait for desktop + USB to initialize

# ADB
adb start-server
for i in {1..60}; do
  adb devices | awk 'NR>1 && $2=="device"{found=1} END{exit !found}' && break
  sleep 2
done

# Port forwarding (Ki0xk UI on mini-PC → tablet browser)
adb reverse tcp:3000 tcp:3000 || true

# Weylus — tablet as touchscreen (https://github.com/nickelc/weylus)
# Default ports: 1701 (web), 9001 (websocket)
adb reverse tcp:1701 tcp:1701 || true
adb reverse tcp:9001 tcp:9001 || true
weylus &

# Virtual webcam for QR scanning via tablet front camera
sudo -n modprobe v4l2loopback \
  devices=1 video_nr=2 card_label="TabletCam" exclusive_caps=1

pkill -f "scrcpy.*--video-source=camera" || true
scrcpy \
  --video-source=camera \
  --camera-facing=front \
  --max-size=1280 \
  --video-bit-rate=8M \
  --v4l2-sink=/dev/video2 \
  --no-audio --no-control --stay-awake \
  >/dev/null 2>&1 &
```

**What this does:**
- **ADB reverse** — the tablet browser accesses `localhost:3000` to reach the Ki0xk UI running on the mini-PC
- **Weylus** — turns the tablet into a USB touchscreen for the mini-PC (ports 1701/9001 are Weylus defaults, not Ki0xk)
- **scrcpy + v4l2loopback** — pipes the tablet's front camera as a virtual webcam (`/dev/video2`) so Firefox on the mini-PC can use it for QR scanning via `navigator.mediaDevices.getUserMedia()`

### QR Scanning

Verify the virtual camera: `v4l2-ctl --list-devices` — should show `TabletCam`.

Firefox/Chromium sees it as a normal webcam. The kiosk UI uses `html5-qrcode` to scan Ethereum addresses (`0x...`) and ENS names (`name.eth`).

### Headless Reboots

Without a monitor connected, the mini-PC may not start a graphical session — Weylus and Firefox kiosk will fail. **Always use a dummy HDMI plug** for unattended kiosks. This is standard practice for ATMs, POS terminals, and festival kiosks.

### Summary

| Component | Role |
|-----------|------|
| Android tablet | Touchscreen (Weylus) + QR camera (scrcpy) |
| Linux mini-PC | Runs Ki0xk UI, NFC, coinslot, all backend logic |
| USB NFC reader | Deterministic card reads via PC/SC |
| Arduino + coin acceptor | Physical cash input |
| Dummy HDMI plug | Reliable unattended reboots |

No tablet apps. No cloud dependencies. No hardcoded users. USB-only, offline-friendly operation.

---

## Demo Modes

| Mode | Coin Input | NFC | Transfers | Gateway | Deploy Target |
|------|-----------|-----|-----------|---------|---------------|
| `demo_online` | UI buttons | Phone (Web NFC) | Real USDC via Arc Bridge | No | Vercel / any host |
| `demo_kiosk` | Arduino serial | USB reader (PC/SC) | Real USDC via Arc Bridge | No | Local PC + tablet |
| `demo_festival` | Arduino serial | USB reader (PC/SC) | Real USDC via Gateway | Yes | Local PC + tablet |

All modes perform **real USDC transfers**. All modes support **NFC card wallets**.

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
| `/api/hardware/status` | GET | Hardware connection status (lightweight) |

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

### NFC Card Wallet Flow

```
Insert Coins → Choose "Save to NFC Card" → Tap Card → Set PIN → Balance Saved
                                                              ↓
                    ← Tap Same Card → Enter PIN → Withdraw → Arc Bridge → USDC on any chain
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
| NFC | `nfc-pcsc` (PC/SC smart card interface), Web NFC API (Android) |
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
│   │   │   ├── nfc/                      # NFC PC/SC + NDEF
│   │   │   └── status/route.ts           # Lightweight hw status
│   │   ├── faucet/route.ts               # Balance + faucet
│   │   └── status/route.ts               # System status
│   └── app/
│       ├── kiosk/
│       │   ├── page.tsx                  # Kiosk home (Buy / NFC Wallet / PIN)
│       │   ├── buy/page.tsx              # ATM buy flow + NFC save
│       │   ├── wallet/page.tsx           # NFC wallet (balance + withdraw)
│       │   └── claim/page.tsx            # PIN wallet claim
│       └── festival/
│           ├── admin/page.tsx            # Admin top-up + gateway + stats
│           └── public/page.tsx           # Self-service top-up + payments
├── components/ki0xk/                     # Custom kiosk components
├── hooks/
│   ├── use-coin-events.ts                # SSE hook for Arduino
│   ├── use-nfc-events.ts                 # NFC hook (PC/SC SSE + Web NFC)
│   └── use-serial-status.ts              # Hardware status polling
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
│       ├── faucet.ts                     # Auto-fund + recurring faucet
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

## Support

For hardware setup help, DIY kiosk questions, or collaboration: [@0xoucan](https://x.com/0xoucan)

---

## License

Apache-2.0
