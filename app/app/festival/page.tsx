'use client'

import Link from 'next/link'
import { ArcadeButton } from '@/components/ki0xk/ArcadeButton'

export default function FestivalPage() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 gap-8">
      {/* Title */}
      <div className="text-center space-y-2">
        <h1
          className="text-xl"
          style={{ color: '#f093fb', textShadow: '0 0 10px rgba(240, 147, 251, 0.5)' }}
        >
          Festival Mode
        </h1>
        <p className="text-[8px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
          Events & Retail
        </p>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-6 w-full max-w-xs">
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

      {/* Back link */}
      <Link href="/app" className="mt-4">
        <span className="text-[8px] uppercase tracking-wider transition-colors" style={{ color: '#7a7a9a' }}>
          Back to Mode Select
        </span>
      </Link>
    </div>
  )
}
