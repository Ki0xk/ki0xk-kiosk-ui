'use client'

import Link from 'next/link'
import { ArcadeButton } from '@/components/ki0xk/ArcadeButton'

export default function FestivalPage() {
  return (
    <div className="h-full flex flex-col p-3 gap-3 overflow-hidden">
      {/* iOS-style header */}
      <div className="flex items-center justify-between px-1">
        <Link
          href="/app"
          className="text-[11px] uppercase tracking-wider px-2 py-0.5 border"
          style={{ color: '#7a7a9a', borderColor: '#7a7a9a' }}
        >
          ‹ Back
        </Link>
        <h1
          className="text-sm"
          style={{ color: '#f093fb', textShadow: '0 0 10px rgba(240, 147, 251, 0.5)' }}
        >
          Festival Mode
        </h1>
        <span className="w-12" />
      </div>

      <p className="text-[11px] uppercase tracking-wider text-center" style={{ color: '#7a7a9a' }}>
        Events & Retail
      </p>

      {/* Options */}
      <div className="flex-1 flex flex-col gap-5 justify-center w-full max-w-xs mx-auto">
        <Link href="/app/festival/admin" className="w-full">
          <ArcadeButton size="lg" variant="primary" className="w-full">
            Admin
          </ArcadeButton>
        </Link>

        <Link href="/app/festival/public" className="w-full">
          <ArcadeButton size="lg" variant="accent" className="w-full">
            Public
          </ArcadeButton>
        </Link>
      </div>
    </div>
  )
}
