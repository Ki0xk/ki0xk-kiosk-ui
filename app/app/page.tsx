'use client'

import Link from 'next/link'
import { ArcadeButton } from '@/components/ki0xk/ArcadeButton'

export default function ModeSelector() {
  return (
    <div className="h-full flex flex-col p-3 gap-3 overflow-hidden">
      {/* Header */}
      <div className="text-center">
        <h1
          className="text-lg"
          style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
        >
          Select Mode
        </h1>
        <p className="text-[11px] uppercase tracking-wider mt-0.5" style={{ color: '#7a7a9a' }}>
          Choose your experience
        </p>
      </div>

      {/* Mode buttons */}
      <div className="flex-1 flex flex-col gap-5 justify-center w-full max-w-xs mx-auto">
        <Link href="/app/kiosk" className="w-full">
          <ArcadeButton size="lg" variant="primary" className="w-full">
            Kiosk Mode
          </ArcadeButton>
        </Link>

        <Link href="/app/festival" className="w-full">
          <ArcadeButton size="lg" variant="secondary" className="w-full">
            Festival Mode
          </ArcadeButton>
        </Link>
      </div>

      {/* Holographic decorative element */}
      <div className="flex gap-1 justify-center">
        {['#78ffd6', '#2a2a4a', '#667eea', '#2a2a4a', '#764ba2', '#2a2a4a', '#ffd700'].map((color, i) => (
          <div
            key={i}
            className="w-2 h-2"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>
  )
}
