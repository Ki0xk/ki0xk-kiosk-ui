# Ki0xk Payment Kiosk

Touch-first kiosk interface for Ki0xk physical crypto ATMs. Built with Next.js 16, React 19, shadcn/ui, and Tailwind CSS v4. Retro arcade-themed with holographic glows, scanlines, coin-drop animations, and NFC pulse effects. Designed for events, festivals, and retail where users insert cash and receive USDC to their wallet.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.0.10, React 19.2.0, TypeScript 5 |
| Styling | Tailwind CSS 4.1.9, CSS custom properties, custom keyframe animations |
| UI Components | shadcn/ui (New York style), 30+ Radix UI primitives, Lucide icons |
| State | React Context + `useReducer` (`lib/state.tsx`) |
| Forms | React Hook Form + Zod validation |
| Font | Press Start 2P (Google Fonts) — pixel arcade aesthetic |
| Animations | tw-animate-css, custom CSS keyframes (coin-drop, nfc-pulse, holo-sweep) |

## Getting Started

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # Production build
pnpm lint         # ESLint
```

## Routes

### Kiosk Mode (cash-to-crypto ATM)

| Route | Purpose |
|-------|---------|
| `/` | Landing page — "Ki0xk" title, "Start Session" CTA |
| `/app` | Mode selector — Kiosk Mode or Festival Mode |
| `/app/kiosk` | Kiosk menu — New User or I Have a Wallet |
| `/app/kiosk/new-user` | Wallet creation with progress bar animation |
| `/app/kiosk/scan` | Wallet access via ENS input, NFC tap, or QR scan |
| `/app/kiosk/wallet` | Display loaded wallet identity, address, and balance |
| `/app/kiosk/add-balance` | Top-up USDC with preset amounts or numeric keypad |

### Festival Mode (wristband payments)

| Route | Purpose |
|-------|---------|
| `/app/festival` | Festival mode selector — Admin or Public |
| `/app/festival/admin` | Admin panel — load cards via NFC + PIN (demo: `1234`) |
| `/app/festival/public` | Public user flow — pay vendors or recharge balance |

## Architecture

### State Management

Global state via `Ki0xkProvider` context wrapping `/app` routes:

```
Ki0xkState {
  sessionActive: boolean
  balanceUSDC:   number
  ensName:       string
  address:       string
  cardId:        string | null
}
```

Actions: `START_SESSION`, `END_SESSION`, `SET_BALANCE`, `ADD_BALANCE`, `SUBTRACT_BALANCE`, `SET_CARD_ID`, `RESET`.

Pages combine global state (session/balance) with local `useState` for UI step navigation. Festival pages use union-typed step state machines:

```typescript
type Step = 'idle' | 'tap' | 'scanning' | 'menu' | 'pay' | 'recharge' | ...
```

### Mock API Layer

All async operations go through `lib/mock.ts` — simulated delays returning mock data. These are the integration points for the real backend:

| Function | Delay | Returns |
|----------|-------|---------|
| `mockCreateWallet()` | 1.5s | Random ENS name + address |
| `mockScanNFC()` | 2.0s | NFC card ID |
| `mockPayment(amount)` | 1.5s | Transaction ID, vendor, remaining balance |
| `mockTopUp(amount)` | 1.8s | Transaction ID, new balance |
| `mockUpdateCard(cardId, amount)` | 1.2s | Success confirmation |

### Path Aliases

`@/*` maps to project root (e.g., `@/components/ki0xk/ArcadeButton`).

## Custom Components (`components/ki0xk/`)

| Component | Description |
|-----------|-------------|
| `ArcadeButton` | Retro button with inset shadows and color-specific glow. Variants: `primary` (gold), `secondary` (dark), `accent` (cyan), `danger` (red). Sizes: `sm`, `md`, `lg`. |
| `CoinAnimation` | Full-screen overlay with 5 falling coins (staggered delays) and amount display. Triggers on `isAnimating` prop. |
| `Modal` | Centered dialog with backdrop blur, holographic gradient border, and colored corner squares. |
| `NFCIndicator` | NFC icon with dynamic SVG waves. States: `ready` (gray), `scanning` (purple + ping rings), `success` (cyan), `error` (red). |
| `NumericKeypad` | 3x4 grid (1-9, CLEAR, 0, DELETE) with glowing display. Supports `isPin` mode for masked input. |
| `PixelFrame` | Arcade cabinet-style frame wrapping `/app` routes. Holographic gradient border, corner squares, scanlines overlay, pixel-grid background. |
| `ProgressBar` | 10-segment bar with holographic color gradient. Auto-increments when `isAnimating` is true, fires `onComplete` at 100%. |
| `Toast` | Top-center notification. Types: `success` (cyan glow), `error` (red glow). Auto-dismisses after configurable duration. |

## Design System

### Color Palette

| Token | Hex | Role |
|-------|-----|------|
| `--holo-gold` | `#ffd700` | Primary actions, headings |
| `--holo-cyan` | `#78ffd6` | Accent, success states |
| `--holo-purple` | `#667eea` | Secondary, focus rings, borders |
| `--holo-deep-purple` | `#764ba2` | Gradients |
| `--holo-pink` | `#f093fb` | Decorative gradients |
| `--background` | `#0a0a1a` | Page background |
| `--card` | `#0f0f24` | Panel backgrounds |
| `--border` | `#2a2a4a` | Dividers |
| `--muted-foreground` | `#7a7a9a` | Secondary text |
| `--foreground` | `#e0e8f0` | Primary text |

### Visual Effects (CSS classes)

| Class | Effect |
|-------|--------|
| `.scanlines` | Repeating horizontal line overlay (CRT monitor) |
| `.pixel-grid` | 16px grid background pattern |
| `.pixel-border` | Multi-layer inset/outset shadow border |
| `.holo-border` | 5-color gradient border image |
| `.holo-shimmer` | Subtle holographic background gradient |
| `.holo-sweep` | Animated gradient sweep (3s loop) |
| `.glow-*` | Box-shadow glows (gold, cyan, purple, pink) |
| `.text-glow-*` | Text-shadow glows (gold, cyan, purple, pink) |
| `.coin-animation` | Falling coin keyframe (0.8s, translateY + rotate) |
| `.nfc-pulse` | Breathing scale animation (1.5s loop) |
| `.touch-active` | Scale down to 0.95 on `:active` |

### Layout

The app renders inside a `PixelFrame` constrained to `max-w-2xl`, `aspect-[3/4]` (portrait arcade cabinet), and `max-h-[90vh]`. Viewport is locked: no user scaling, `maximum-scale=1`.

## License

Apache-2.0
