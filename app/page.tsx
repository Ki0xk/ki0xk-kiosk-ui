'use client'

import Link from 'next/link'
import { ArcadeButton } from '@/components/ki0xk/ArcadeButton'

export default function LandingPage() {
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
      <div className="relative z-10 flex flex-col items-center gap-12 max-w-lg text-center">
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

        {/* Subtitle */}
        <p
          className="text-lg md:text-xl tracking-widest"
          style={{ color: '#e0e8f0' }}
        >
          Tap. Pay. Settle.
        </p>

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
            Start Session
          </ArcadeButton>
        </Link>

        {/* Footer hint */}
        <p className="text-[8px] uppercase tracking-widest mt-8" style={{ color: '#7a7a9a' }}>
          Touch to begin
        </p>
      </div>
    </div>
  )
}
