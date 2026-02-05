'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArcadeButton } from '@/components/ki0xk/ArcadeButton'
import { useKi0xk } from '@/lib/state'

export default function WalletPage() {
  const router = useRouter()
  const { state } = useKi0xk()

  useEffect(() => {
    if (!state.sessionActive && !state.ensName) {
      router.push('/app/kiosk')
    }
  }, [state.sessionActive, state.ensName, router])

  const truncatedAddress = state.address
    ? `${state.address.slice(0, 6)}...${state.address.slice(-4)}`
    : ''

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 gap-6">
      {/* Status badge */}
      <div
        className="flex items-center gap-2 px-4 py-2 border-2"
        style={{
          borderColor: '#78ffd6',
          backgroundColor: 'rgba(120, 255, 214, 0.08)',
        }}
      >
        <div className="w-2 h-2 animate-pulse" style={{ backgroundColor: '#78ffd6' }} />
        <span className="text-[8px] uppercase tracking-wider" style={{ color: '#78ffd6' }}>
          Wallet Ready
        </span>
      </div>

      {/* Wallet info */}
      <div className="w-full max-w-xs space-y-4">
        {/* ENS Name */}
        <div
          className="p-4 border-2"
          style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}
        >
          <p className="text-[8px] uppercase tracking-wider mb-2" style={{ color: '#7a7a9a' }}>
            Identity
          </p>
          <p
            className="text-sm break-all"
            style={{ color: '#ffd700', textShadow: '0 0 8px rgba(255, 215, 0, 0.4)' }}
          >
            {state.ensName || 'player1.ki0xk.eth'}
          </p>
        </div>

        {/* Address */}
        <div
          className="p-4 border-2"
          style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}
        >
          <p className="text-[8px] uppercase tracking-wider mb-2" style={{ color: '#7a7a9a' }}>
            Address
          </p>
          <p className="text-[10px] break-all" style={{ color: '#667eea' }}>
            {truncatedAddress || '0x1234...5678'}
          </p>
        </div>

        {/* Balance */}
        <div
          className="p-4 border-2"
          style={{
            backgroundColor: '#0f0f24',
            borderImage: 'linear-gradient(135deg, #78ffd6, #667eea, #ffd700) 1',
            borderStyle: 'solid',
            borderWidth: '2px',
            boxShadow: '0 0 12px rgba(102, 126, 234, 0.15)',
          }}
        >
          <p className="text-[8px] uppercase tracking-wider mb-2" style={{ color: '#7a7a9a' }}>
            Balance
          </p>
          <p className="text-2xl" style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}>
            ${state.balanceUSDC.toFixed(2)}
            <span className="text-xs ml-2" style={{ color: '#7a7a9a' }}>USDC</span>
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-4 w-full max-w-xs mt-4">
        <Link href="/app/kiosk/add-balance" className="w-full">
          <ArcadeButton size="md" variant="primary" className="w-full">
            Add Balance
          </ArcadeButton>
        </Link>

        <Link href="/app" className="w-full">
          <ArcadeButton size="md" variant="secondary" className="w-full">
            Done
          </ArcadeButton>
        </Link>
      </div>
    </div>
  )
}
