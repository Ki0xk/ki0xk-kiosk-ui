'use client'

import Link from 'next/link'
import { ArcadeButton } from '@/components/ki0xk/ArcadeButton'
import { getMode } from '@/lib/mode'
import { ONLINE_MAX_USDC } from '@/lib/constants'

export default function LandingPage() {
  const isOnlineDemo = getMode() === 'online'

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 pixel-grid">
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 blur-[120px]" style={{ background: 'rgba(102, 126, 234, 0.08)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 blur-[120px]" style={{ background: 'rgba(120, 255, 214, 0.06)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 blur-[150px]" style={{ background: 'rgba(240, 147, 251, 0.04)' }} />
      </div>

      {/* Scanlines overlay */}
      <div className="fixed inset-0 scanlines pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 max-w-lg text-center">
        {/* Logo / Title */}
        <div className="space-y-4">
          <h1
            className="text-4xl md:text-5xl tracking-wider"
            style={{
              color: '#ffd700',
              textShadow: '0 0 12px #ffd700, 0 0 30px rgba(255, 215, 0, 0.4)',
            }}
          >
            Ki0xk
          </h1>
          {/* Holographic divider */}
          <div
            className="w-40 h-1 mx-auto"
            style={{
              background: 'linear-gradient(90deg, #78ffd6, #667eea, #764ba2, #f093fb, #ffd700)',
              boxShadow: '0 0 12px rgba(102, 126, 234, 0.5)',
            }}
          />
        </div>

        {/* Tagline */}
        <p
          className="text-sm md:text-base tracking-widest"
          style={{ color: '#e0e8f0' }}
        >
          Cash to Crypto. No wallet needed.
        </p>

        {/* 3-step flow */}
        <div className="flex gap-4 items-center">
          {[
            { step: '1', label: 'Insert Cash', color: '#ffd700' },
            { step: '2', label: 'Choose Destination', color: '#667eea' },
            { step: '3', label: 'Receive USDC', color: '#78ffd6' },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div
                className="w-8 h-8 flex items-center justify-center text-sm font-bold"
                style={{
                  backgroundColor: '#0f0f24',
                  border: `2px solid ${item.color}`,
                  color: item.color,
                  boxShadow: `0 0 8px ${item.color}40`,
                }}
              >
                {item.step}
              </div>
              <p className="text-[0.625rem] uppercase tracking-wider" style={{ color: item.color }}>
                {item.label}
              </p>
              {i < 2 && (
                <div className="hidden" /> // arrows handled by flex gap
              )}
            </div>
          ))}
        </div>

        {/* Value prop */}
        <p className="text-[0.8125rem] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
          No KYC. No gas fees. No waiting.
        </p>

        {/* Online demo: feature cards */}
        {isOnlineDemo && (
          <div className="w-full space-y-2">
            {/* Two modes */}
            <div className="grid grid-cols-2 gap-2">
              <div
                className="p-3 border-2 text-left"
                style={{ backgroundColor: '#0f0f24', borderColor: '#667eea' }}
              >
                <p className="text-[0.6875rem] uppercase tracking-wider mb-1" style={{ color: '#667eea' }}>
                  ATM Mode
                </p>
                <p className="text-[0.5625rem]" style={{ color: '#7a7a9a' }}>
                  Insert coins, receive USDC instantly via Yellow Network
                </p>
              </div>
              <div
                className="p-3 border-2 text-left"
                style={{ backgroundColor: '#0f0f24', borderColor: '#f093fb' }}
              >
                <p className="text-[0.6875rem] uppercase tracking-wider mb-1" style={{ color: '#f093fb' }}>
                  Festival Mode
                </p>
                <p className="text-[0.5625rem]" style={{ color: '#7a7a9a' }}>
                  NFC wristband payments with merchant cart + Yellow Network
                </p>
              </div>
            </div>

            {/* Feature highlights */}
            <div
              className="p-3 border-2"
              style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}
            >
              <p className="text-[0.6875rem] uppercase tracking-wider mb-2" style={{ color: '#ffd700' }}>
                Online Demo — No Hardware Needed
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[0.5625rem]" style={{ color: '#7a7a9a' }}>
                <span style={{ color: '#78ffd6' }}>+ Simulated coins</span>
                <span style={{ color: '#78ffd6' }}>+ Real USDC transfers</span>
                <span style={{ color: '#78ffd6' }}>+ Virtual NFC wallets</span>
                <span style={{ color: '#78ffd6' }}>+ 7 destination chains</span>
                <span style={{ color: '#78ffd6' }}>+ Festival payments</span>
                <span style={{ color: '#78ffd6' }}>+ Cross-chain bridging</span>
              </div>
            </div>

            {/* Integrations */}
            <div className="flex gap-2">
              {[
                { name: 'Yellow Network', desc: 'Off-chain accounting', color: '#ffd700' },
                { name: 'NFC Wallets', desc: 'Any card = wallet', color: '#667eea' },
                { name: 'ENS', desc: 'name.eth support', color: '#78ffd6' },
              ].map((int) => (
                <div
                  key={int.name}
                  className="flex-1 p-2 border text-center"
                  style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}
                >
                  <p className="text-[0.5625rem] uppercase" style={{ color: int.color }}>{int.name}</p>
                  <p className="text-[0.5rem]" style={{ color: '#7a7a9a' }}>{int.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Decorative pixel art element - holographic */}
        <div className="flex gap-2 items-center">
          {['#78ffd6', '#667eea', '#764ba2', '#f093fb', '#ffd700'].map((color, i) => (
            <div
              key={i}
              className="w-4 h-4"
              style={{
                backgroundColor: color,
                opacity: 0.7,
                transform: `translateY(${Math.sin(i * 0.8) * 8}px)`,
                boxShadow: `0 0 8px ${color}60`,
              }}
            />
          ))}
        </div>

        {/* CTA Button */}
        <Link href="/app">
          <ArcadeButton size="lg" variant="primary">
            {isOnlineDemo ? 'Launch Demo' : 'Start Demo'}
          </ArcadeButton>
        </Link>

        {isOnlineDemo && (
          <p className="text-[0.5625rem] uppercase tracking-wider" style={{ color: '#f093fb' }}>
            Testnet USDC — ${ONLINE_MAX_USDC.toFixed(2)} max per session — all transfers are real
          </p>
        )}

        {/* Footer */}
        <div className="space-y-2 mt-2">
          <p className="text-[0.625rem] uppercase tracking-wider" style={{ color: '#667eea' }}>
            Powered by Yellow Network
          </p>
          <p className="text-[0.625rem] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
            Built for tienditas, festivals & events
          </p>
        </div>
      </div>

      {/* LED Marquee — mainnet announcement */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 overflow-hidden"
        style={{
          backgroundColor: '#0a0a1a',
          borderTop: '2px solid #78ffd640',
          boxShadow: '0 -4px 20px rgba(120, 255, 214, 0.15)',
        }}
      >
        {/* Pulsing dot */}
        <div
          className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full z-10"
          style={{
            backgroundColor: '#78ffd6',
            boxShadow: '0 0 6px #78ffd6, 0 0 12px rgba(120, 255, 214, 0.5)',
            animation: 'pulse-dot 2s ease-in-out infinite',
          }}
        />
        <div className="marquee-track py-2 pl-8">
          {[0, 1].map((i) => (
            <span
              key={i}
              className="marquee-content text-[0.5625rem] uppercase tracking-[0.25em] whitespace-nowrap"
              style={{ color: '#78ffd6' }}
              aria-hidden={i === 1}
            >
              MAINNET USDC LIVE ON PHYSICAL KIOSK &amp; FESTIVAL HARDWARE
              <span style={{ color: '#ffd700', margin: '0 2em' }}>///</span>
              REAL TOKENS ON BASE, ETHEREUM, ARBITRUM, POLYGON, OPTIMISM, AVALANCHE, LINEA
              <span style={{ color: '#ffd700', margin: '0 2em' }}>///</span>
              KIOSK MODE: CASH TO MAINNET USDC
              <span style={{ color: '#ffd700', margin: '0 2em' }}>///</span>
              FESTIVAL MODE: NFC WRISTBAND PAYMENTS WITH MAINNET SETTLEMENT
              <span style={{ color: '#ffd700', margin: '0 2em' }}>///</span>
              POWERED BY YELLOW NETWORK
              <span style={{ color: '#ffd700', margin: '0 2em' }}>///</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
