'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArcadeButton } from '@/components/ki0xk/ArcadeButton'
import { NumericKeypad } from '@/components/ki0xk/NumericKeypad'
import { ProgressBar } from '@/components/ki0xk/ProgressBar'
import { CoinAnimation } from '@/components/ki0xk/CoinAnimation'
import { useKi0xk, actions } from '@/lib/state'
import { mockTopUp } from '@/lib/mock'
import { PRESET_AMOUNTS } from '@/lib/constants'

export default function AddBalancePage() {
  const router = useRouter()
  const { state, dispatch } = useKi0xk()
  const [amount, setAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showCoinAnimation, setShowCoinAnimation] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const handlePresetAmount = (preset: number) => {
    setAmount(preset.toString())
  }

  const handleAddBalance = async () => {
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) return

    setIsProcessing(true)

    try {
      await mockTopUp(numAmount)
      setShowCoinAnimation(true)

      setTimeout(() => {
        dispatch(actions.addBalance(numAmount))
        setShowCoinAnimation(false)
        setIsComplete(true)
      }, 1500)
    } catch {
      setIsProcessing(false)
    }
  }

  const handleFinish = () => {
    router.push('/app')
  }

  if (isComplete) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 gap-6">
        {/* Success icon */}
        <div
          className="w-20 h-20 flex items-center justify-center"
          style={{
            border: '4px solid #78ffd6',
            boxShadow: '0 0 12px rgba(120, 255, 214, 0.4), 0 0 24px rgba(120, 255, 214, 0.15)',
          }}
        >
          <span className="text-3xl" style={{ color: '#78ffd6' }}>+</span>
        </div>

        <div className="text-center space-y-2">
          <h1
            className="text-lg"
            style={{ color: '#78ffd6', textShadow: '0 0 10px rgba(120, 255, 214, 0.5)' }}
          >
            Balance Added
          </h1>
          <p className="text-2xl" style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}>
            ${state.balanceUSDC.toFixed(2)} USDC
          </p>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-xs mt-4">
          <ArcadeButton size="md" variant="primary" onClick={handleFinish} className="w-full">
            Finish Session
          </ArcadeButton>

          <ArcadeButton
            size="md"
            variant="secondary"
            onClick={() => {
              setIsComplete(false)
              setAmount('')
            }}
            className="w-full"
          >
            Add More
          </ArcadeButton>
        </div>
      </div>
    )
  }

  if (isProcessing) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 gap-8">
        <CoinAnimation isAnimating={showCoinAnimation} amount={parseFloat(amount)} />

        <div className="text-center space-y-4">
          <h1
            className="text-lg"
            style={{ color: '#667eea', textShadow: '0 0 10px rgba(102, 126, 234, 0.5)' }}
          >
            Processing
          </h1>
          <p className="text-[8px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
            {'Adding $'}{amount}{' USDC...'}
          </p>
        </div>

        <div className="w-full max-w-xs">
          <ProgressBar progress={0} isAnimating={true} />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
      {/* Header */}
      <div className="text-center">
        <h1
          className="text-sm"
          style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
        >
          Add Balance
        </h1>
        <p className="text-[8px] uppercase tracking-wider mt-1" style={{ color: '#7a7a9a' }}>
          Select or enter amount
        </p>
      </div>

      {/* Currency label */}
      <div className="flex justify-center">
        <span
          className="px-3 py-1 border-2 text-[10px]"
          style={{ backgroundColor: '#0f0f24', borderColor: '#667eea', color: '#667eea' }}
        >
          USDC
        </span>
      </div>

      {/* Preset amounts */}
      <div className="grid grid-cols-5 gap-2">
        {PRESET_AMOUNTS.map((preset) => (
          <button
            key={preset}
            onClick={() => handlePresetAmount(preset)}
            className="p-3 border-2 text-[10px] transition-all touch-active"
            style={{
              borderColor: amount === preset.toString() ? '#ffd700' : '#2a2a4a',
              backgroundColor: amount === preset.toString() ? 'rgba(255, 215, 0, 0.1)' : '#0f0f24',
              color: amount === preset.toString() ? '#ffd700' : '#e0e8f0',
              boxShadow: amount === preset.toString() ? '0 0 8px rgba(255, 215, 0, 0.2)' : 'none',
            }}
          >
            ${preset}
          </button>
        ))}
      </div>

      {/* Keypad */}
      <div className="flex-1 flex items-center justify-center">
        <NumericKeypad value={amount} onChange={setAmount} maxLength={5} />
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3">
        <ArcadeButton
          size="md"
          variant="primary"
          onClick={handleAddBalance}
          disabled={!amount || parseFloat(amount) <= 0}
          className="w-full"
        >
          {'Add $'}{amount || '0'}{' Balance'}
        </ArcadeButton>

        <a href="/app/kiosk/wallet" className="text-center">
          <span className="text-[8px] uppercase tracking-wider transition-colors" style={{ color: '#7a7a9a' }}>
            Cancel
          </span>
        </a>
      </div>
    </div>
  )
}
