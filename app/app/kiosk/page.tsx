'use client'

import Link from 'next/link'
import { ArcadeButton } from '@/components/ki0xk/ArcadeButton'

export default function KioskPage() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 gap-8">
      {/* Title */}
      <div className="text-center space-y-2">
        <h1
          className="text-xl"
          style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
        >
          Kiosk Mode
        </h1>
        <p className="text-[11px] uppercase tracking-wider" style={{ color: '#78ffd6' }}>
          Cash to Crypto ATM
        </p>
        <p className="text-[10px] mt-1" style={{ color: '#7a7a9a' }}>
          Any NFC card becomes a crypto wallet
        </p>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-5 w-full max-w-xs">
        <Link href="/app/kiosk/buy" className="w-full">
          <ArcadeButton size="lg" variant="primary" className="w-full">
            Buy Crypto
          </ArcadeButton>
          <p className="text-[10px] text-center mt-1" style={{ color: '#7a7a9a' }}>
            Insert coins → send to wallet, ENS, NFC card, or PIN
          </p>
        </Link>

        <Link href="/app/kiosk/wallet" className="w-full">
          <ArcadeButton size="lg" variant="secondary" className="w-full">
            NFC Wallet
          </ArcadeButton>
          <p className="text-[10px] text-center mt-1" style={{ color: '#7a7a9a' }}>
            Tap any NFC card to check balance or withdraw
          </p>
        </Link>

        <Link href="/app/kiosk/claim" className="w-full">
          <ArcadeButton size="lg" variant="secondary" className="w-full">
            I Have a PIN
          </ArcadeButton>
          <p className="text-[10px] text-center mt-1" style={{ color: '#7a7a9a' }}>
            Claim balance using wallet ID + PIN receipt
          </p>
        </Link>
      </div>

      {/* Back link */}
      <Link href="/app" className="mt-4 inline-block px-3 py-1 border text-[11px] uppercase tracking-wider transition-colors" style={{ color: '#7a7a9a', borderColor: '#7a7a9a' }}>
        ‹ Back to Mode Select
      </Link>
    </div>
  )
}
