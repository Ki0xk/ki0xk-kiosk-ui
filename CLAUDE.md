# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Ki0xk Payment Kiosk — a Next.js 16 frontend for a crypto ATM that converts physical coins to USDC. Users insert coins, choose a destination (QR scan, ENS name, NFC card, or PIN wallet), and receive USDC bridged to their preferred chain. Retro arcade aesthetic with holographic effects.

## Commands

```bash
npm run dev          # Next.js dev server (hot reload)
npm run build        # Production build (TS errors ignored via config)
npm run lint         # ESLint
npm run start        # Production server
```

No test framework is configured.

## Architecture

### Three Operating Modes

Set via `NEXT_PUBLIC_MODE` env var:

| Mode | Coin Input | NFC | Settlement |
|------|-----------|-----|------------|
| `online` | UI buttons (simulated) | Phone Web NFC | Arc Bridge (CCTP) |
| `kiosk` | Arduino serial | USB PC/SC reader | Arc Bridge (CCTP) |
| `festival` | Arduino serial | USB PC/SC reader | Circle Gateway |

Mode features are resolved in `lib/mode.ts`. All modes perform real ClearNode transfers.

### State Management

React Context + useReducer in `lib/state.tsx`. Wrap with `<Ki0xkProvider>`, access via `useKi0xk()` hook. Action creators are exported as `actions.*` (e.g., `actions.insertCoin(pesos, usdc)`).

### Server-Side Code

All API routes use `export const runtime = 'nodejs'` (native modules: serialport, nfc-pcsc, ws). Server-only code lives in `lib/server/`:

- `config.ts` — Zod-validated env config (call `getServerConfig()`)
- `clearnode.ts` — Yellow Network off-chain transfers
- `session.ts` — Session lifecycle (persisted to `sessions.json`)
- `settlement.ts` — PIN wallet creation (persisted to `pin-wallets.json`)
- `festival-cards.ts` — NFC card balances (persisted to `festival-cards.json`)
- `serial.ts` / `nfc.ts` — Hardware managers (singleton)
- `arc/bridge.ts` — Circle CCTP bridge integration
- `gateway/index.ts` — Circle Gateway burn/mint for festival mode

### Client-Side Hooks

- `use-coin-events.ts` — SSE from `/api/hardware/coin/events`, deduplicates by event ID
- `use-nfc-events.ts` — Dual strategy: PC/SC (SSE) for kiosk + Web NFC API for phones
- `use-serial-status.ts` — Polls `/api/hardware/status`

### API Client

`lib/api-client.ts` exports typed wrappers for every API route. Always use these instead of raw `fetch` from components.

### Key Data Flows

**ATM session**: `POST /api/session/start` → coin deposits via `POST /api/session/deposit` → settle with `POST /api/session/end` (bridge) or `POST /api/session/pin` (PIN wallet).

**Festival payment**: Tap NFC card → verify PIN → `POST /api/festival/pay` → deduct card balance → Gateway burn+mint to merchant.

**NFC card claim**: Verify card PIN → `POST /api/festival/claim` → deduct balance → Arc Bridge to destination chain.

### Routing Structure

- `/` — Landing page
- `/app/kiosk/` — ATM mode (buy, wallet, claim)
- `/app/festival/` — Festival mode (admin dashboard, public self-service)
- `/api/session/*` — ATM session endpoints
- `/api/festival/*` — Festival/NFC card endpoints
- `/api/hardware/*` — Arduino serial + NFC hardware (SSE streams)
- `/api/status`, `/api/faucet` — System health + testnet funding

## Tech & Conventions

- **Next.js 16** with App Router, **React 19**, **TypeScript 5** (strict)
- **Tailwind CSS v4** via `@tailwindcss/postcss` — config is in `globals.css` `@theme` block, not `tailwind.config`
- **shadcn/ui** (new-york style, Radix UI primitives) in `components/ui/`
- Custom kiosk components in `components/ki0xk/`
- Path alias: `@/*` maps to project root
- Icons: `lucide-react`
- Font: Press Start 2P (pixel retro) loaded from `/public/fonts/`
- Root font size: `clamp(10px, 2.2vh, 16px)` — viewport-relative scaling
- Auto-zoom: `clamp(1, min(vw/800, vh/500), 3)` applied in app layout

### CSS Custom Properties (Holographic Palette)

```
--holo-cyan: #78ffd6    --holo-purple: #667eea
--holo-pink: #f093fb    --holo-gold: #ffd700
--holo-deep-purple: #764ba2
```

Glow classes: `.glow-gold`, `.glow-cyan`, `.glow-purple`, `.glow-pink`. CRT scanlines: `.scanlines`. Pixel borders: `.pixel-border`.

### Native Module Handling

`serialport`, `ws`, `@serialport/parser-readline`, and `nfc-pcsc` are listed in `next.config.mjs` `serverExternalPackages` to prevent bundling.

## Environment

Required: `PRIVATE_KEY` (0x-prefixed 64-char hex). Everything else has defaults for Base Sepolia testnet. See `.env.example` and `lib/server/config.ts` for the full Zod schema.

## Subprojects

`backend/` and `coinslot/` are separate subprojects with their own `CLAUDE.md` files. They are not part of the Next.js build.
