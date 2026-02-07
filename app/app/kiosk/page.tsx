'use client'

import Link from 'next/link'
import { ArcadeButton } from '@/components/ki0xk/ArcadeButton'

export default function KioskPage() {
  return (
    <div className="h-full flex flex-col p-3 gap-3 overflow-hidden">
      {/* iOS-style header */}
      <div className="flex items-center justify-between px-1">
        <Link
          href="/app"
          className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
          style={{ color: '#7a7a9a', borderColor: '#7a7a9a' }}
        >
          ‹ Back
        </Link>
        <h1
          className="text-sm"
          style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
        >
          Kiosk Mode
        </h1>
        <span className="w-12" />
      </div>

      <div className="text-center">
        <p className="text-[0.6875rem] uppercase tracking-wider" style={{ color: '#78ffd6' }}>
          Cash to Crypto ATM
        </p>
        <p className="text-[0.625rem] mt-0.5" style={{ color: '#7a7a9a' }}>
          Any NFC card becomes a crypto wallet
        </p>
      </div>

      {/* Options */}
      <div className="flex-1 flex flex-col gap-3 justify-center w-full max-w-xs mx-auto">
        <Link href="/app/kiosk/buy" className="w-full">
          <ArcadeButton size="lg" variant="primary" className="w-full">
            Buy Crypto
          </ArcadeButton>
        </Link>

        <Link href="/app/kiosk/wallet" className="w-full">
          <ArcadeButton size="lg" variant="secondary" className="w-full">
            NFC Wallet
          </ArcadeButton>
        </Link>

        <Link href="/app/kiosk/claim" className="w-full">
          <ArcadeButton size="lg" variant="secondary" className="w-full">
            I Have a PIN
          </ArcadeButton>
        </Link>
      </div>
    </div>
  )
}
