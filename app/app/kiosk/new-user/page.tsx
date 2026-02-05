'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArcadeButton } from '@/components/ki0xk/ArcadeButton'
import { ProgressBar } from '@/components/ki0xk/ProgressBar'
import { useKi0xk, actions } from '@/lib/state'
import { mockCreateWallet } from '@/lib/mock'

export default function NewUserPage() {
  const router = useRouter()
  const { dispatch } = useKi0xk()
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateWallet = async () => {
    setIsCreating(true)

    try {
      const { ensName, address } = await mockCreateWallet()
      dispatch(actions.startSession(ensName, address))
      router.push('/app/kiosk/wallet')
    } catch {
      setIsCreating(false)
    }
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 gap-8">
      {isCreating ? (
        <>
          <div className="text-center space-y-4">
            <h1
              className="text-lg"
              style={{ color: '#667eea', textShadow: '0 0 10px rgba(102, 126, 234, 0.5)' }}
            >
              Creating Wallet
            </h1>
            <p className="text-[8px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
              Please wait...
            </p>
          </div>

          <div className="w-full max-w-xs">
            <ProgressBar progress={0} isAnimating={true} />
          </div>
        </>
      ) : (
        <>
          <div className="text-center space-y-4">
            <h1
              className="text-lg"
              style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
            >
              Welcome
            </h1>
            <p className="text-[10px] leading-relaxed max-w-xs" style={{ color: '#e0e8f0' }}>
              Create your wallet in seconds
            </p>
          </div>

          {/* Decorative holographic element */}
          <div
            className="w-16 h-16 flex items-center justify-center"
            style={{
              border: '3px solid transparent',
              borderImage: 'linear-gradient(135deg, #78ffd6, #667eea, #f093fb, #ffd700) 1',
              boxShadow: '0 0 16px rgba(102, 126, 234, 0.2)',
            }}
          >
            <div
              className="w-8 h-8"
              style={{ background: 'linear-gradient(135deg, #667eea40, #78ffd640)' }}
            />
          </div>

          <ArcadeButton
            size="lg"
            variant="primary"
            onClick={handleCreateWallet}
          >
            Create Wallet (Demo)
          </ArcadeButton>

          <a href="/app/kiosk">
            <span className="text-[8px] uppercase tracking-wider transition-colors" style={{ color: '#7a7a9a' }}>
              Go Back
            </span>
          </a>
        </>
      )}
    </div>
  )
}
