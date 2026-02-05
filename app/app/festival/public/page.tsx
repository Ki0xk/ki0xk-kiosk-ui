'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArcadeButton } from '@/components/ki0xk/ArcadeButton'
import { NFCIndicator } from '@/components/ki0xk/NFCIndicator'
import { ProgressBar } from '@/components/ki0xk/ProgressBar'
import { NumericKeypad } from '@/components/ki0xk/NumericKeypad'
import { CoinAnimation } from '@/components/ki0xk/CoinAnimation'
import { mockScanNFC, mockPayment, mockTopUp } from '@/lib/mock'
import { PRESET_AMOUNTS, VENDORS } from '@/lib/constants'

type Step =
  | 'idle'
  | 'tap'
  | 'scanning'
  | 'menu'
  | 'recharge'
  | 'recharge-processing'
  | 'recharge-success'
  | 'select-amount'
  | 'processing'
  | 'success'

export default function FestivalPublicPage() {
  const [step, setStep] = useState<Step>('idle')
  const [amount, setAmount] = useState('')
  const [rechargeAmount, setRechargeAmount] = useState('')
  const [balance, setBalance] = useState(25.50)
  const [vendor, setVendor] = useState(VENDORS[0])
  const [remainingBalance, setRemainingBalance] = useState(0)
  const [showCoinAnimation, setShowCoinAnimation] = useState(false)

  const handleTapNFC = async () => {
    setStep('scanning')
    try {
      const result = await mockScanNFC()
      if (result.success) {
        setStep('menu')
      }
    } catch {
      setStep('idle')
    }
  }

  const handleRecharge = async () => {
    const numAmount = parseFloat(rechargeAmount)
    if (isNaN(numAmount) || numAmount <= 0) return
    setStep('recharge-processing')
    setShowCoinAnimation(true)
    try {
      await mockTopUp(numAmount)
      const newBalance = balance + numAmount
      setBalance(newBalance)
      setTimeout(() => {
        setShowCoinAnimation(false)
        setStep('recharge-success')
      }, 1500)
    } catch {
      setShowCoinAnimation(false)
      setStep('recharge')
    }
  }

  const handlePayment = async () => {
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0 || numAmount > balance) return
    setStep('processing')
    try {
      const result = await mockPayment(numAmount)
      const newBalance = balance - numAmount
      setRemainingBalance(newBalance)
      setBalance(newBalance)
      setVendor(result.vendor)
      setStep('success')
    } catch {
      setStep('select-amount')
    }
  }

  const handleBackToMenu = () => {
    setStep('menu')
    setAmount('')
    setRechargeAmount('')
  }

  const handleNewSession = () => {
    setStep('idle')
    setAmount('')
    setRechargeAmount('')
  }

  // Payment Success
  if (step === 'success') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 gap-6">
        <div
          className="w-24 h-24 flex items-center justify-center animate-pulse"
          style={{
            border: '4px solid #78ffd6',
            boxShadow: '0 0 12px rgba(120, 255, 214, 0.4), 0 0 24px rgba(120, 255, 214, 0.15)',
          }}
        >
          <svg viewBox="0 0 24 24" className="w-12 h-12" fill="none" stroke="#78ffd6" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <div className="text-center space-y-4">
          <h1
            className="text-lg"
            style={{ color: '#78ffd6', textShadow: '0 0 10px rgba(120, 255, 214, 0.5)' }}
          >
            Payment Successful
          </h1>

          <div className="p-4 border-2" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
            <p className="text-[8px] uppercase mb-2" style={{ color: '#7a7a9a' }}>Vendor</p>
            <p className="text-sm" style={{ color: '#f093fb' }}>{vendor.name}</p>
          </div>

          <div
            className="p-4 border-2"
            style={{
              backgroundColor: '#0f0f24',
              borderImage: 'linear-gradient(135deg, #78ffd6, #667eea, #ffd700) 1',
              borderStyle: 'solid',
              borderWidth: '2px',
            }}
          >
            <p className="text-[8px] uppercase mb-2" style={{ color: '#7a7a9a' }}>Remaining Balance</p>
            <p className="text-2xl" style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}>
              ${remainingBalance.toFixed(2)}
              <span className="text-xs ml-2" style={{ color: '#7a7a9a' }}>USDC</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
          <ArcadeButton size="md" variant="primary" onClick={handleBackToMenu} className="w-full">
            Back to Menu
          </ArcadeButton>
          <ArcadeButton size="md" variant="secondary" onClick={handleNewSession} className="w-full">
            End Session
          </ArcadeButton>
        </div>
      </div>
    )
  }

  // Recharge Success
  if (step === 'recharge-success') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 gap-6">
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
            ${balance.toFixed(2)} USDC
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
          <ArcadeButton
            size="md"
            variant="accent"
            onClick={() => { setStep('select-amount'); setAmount('') }}
            className="w-full"
          >
            Pay Now
          </ArcadeButton>
          <ArcadeButton size="md" variant="primary" onClick={handleBackToMenu} className="w-full">
            Back to Menu
          </ArcadeButton>
          <ArcadeButton
            size="md"
            variant="secondary"
            onClick={() => { setRechargeAmount(''); setStep('recharge') }}
            className="w-full"
          >
            Add More
          </ArcadeButton>
        </div>
      </div>
    )
  }

  // Recharge Processing
  if (step === 'recharge-processing') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 gap-8">
        <CoinAnimation isAnimating={showCoinAnimation} amount={parseFloat(rechargeAmount)} />
        <div className="text-center space-y-4">
          <h1
            className="text-lg"
            style={{ color: '#667eea', textShadow: '0 0 10px rgba(102, 126, 234, 0.5)' }}
          >
            Processing
          </h1>
          <p className="text-[8px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
            {'Adding $'}{rechargeAmount}{' USDC...'}
          </p>
        </div>
        <div className="w-full max-w-xs">
          <ProgressBar progress={0} isAnimating={true} />
        </div>
      </div>
    )
  }

  // Recharge
  if (step === 'recharge') {
    return (
      <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
        <div className="text-center">
          <h1
            className="text-sm"
            style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
          >
            Recharge Balance
          </h1>
          <p className="text-[8px] uppercase tracking-wider mt-1" style={{ color: '#7a7a9a' }}>
            Select or enter amount
          </p>
        </div>

        {/* Current balance */}
        <div className="p-3 border-2 text-center" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
          <p className="text-[8px] uppercase mb-1" style={{ color: '#7a7a9a' }}>Current Balance</p>
          <p className="text-lg" style={{ color: '#ffd700' }}>
            ${balance.toFixed(2)} <span className="text-xs" style={{ color: '#7a7a9a' }}>USDC</span>
          </p>
        </div>

        {/* Currency label */}
        <div className="flex justify-center">
          <span className="px-3 py-1 border-2 text-[10px]" style={{ backgroundColor: '#0f0f24', borderColor: '#667eea', color: '#667eea' }}>
            USDC
          </span>
        </div>

        {/* Preset amounts */}
        <div className="grid grid-cols-5 gap-2">
          {PRESET_AMOUNTS.map((preset) => (
            <button
              key={preset}
              onClick={() => setRechargeAmount(preset.toString())}
              className="p-3 border-2 text-[10px] transition-all touch-active"
              style={{
                borderColor: rechargeAmount === preset.toString() ? '#ffd700' : '#2a2a4a',
                backgroundColor: rechargeAmount === preset.toString() ? 'rgba(255, 215, 0, 0.1)' : '#0f0f24',
                color: rechargeAmount === preset.toString() ? '#ffd700' : '#e0e8f0',
              }}
            >
              ${preset}
            </button>
          ))}
        </div>

        {/* Keypad */}
        <div className="flex-1 flex items-center justify-center">
          <NumericKeypad value={rechargeAmount} onChange={setRechargeAmount} maxLength={5} />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <ArcadeButton
            size="md"
            variant="primary"
            onClick={handleRecharge}
            disabled={!rechargeAmount || parseFloat(rechargeAmount) <= 0}
            className="w-full"
          >
            {'Add $'}{rechargeAmount || '0'}{' Balance'}
          </ArcadeButton>
          <button
            onClick={handleBackToMenu}
            className="text-[8px] uppercase tracking-wider transition-colors"
            style={{ color: '#7a7a9a' }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // Processing
  if (step === 'processing') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 gap-8">
        <div className="text-center space-y-4">
          <h1
            className="text-lg"
            style={{ color: '#667eea', textShadow: '0 0 10px rgba(102, 126, 234, 0.5)' }}
          >
            Processing
          </h1>
          <p className="text-[8px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
            Completing payment...
          </p>
        </div>
        <div className="w-full max-w-xs">
          <ProgressBar progress={0} isAnimating={true} />
        </div>
      </div>
    )
  }

  // Scanning
  if (step === 'scanning') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 gap-8">
        <div className="text-center space-y-4">
          <h1
            className="text-lg"
            style={{ color: '#f093fb', textShadow: '0 0 10px rgba(240, 147, 251, 0.5)' }}
          >
            Scanning
          </h1>
          <p className="text-[8px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
            Hold wristband near reader
          </p>
        </div>
        <NFCIndicator status="scanning" />
        <ArcadeButton size="sm" variant="secondary" onClick={() => setStep('idle')}>
          Cancel
        </ArcadeButton>
      </div>
    )
  }

  // Menu
  if (step === 'menu') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 gap-6">
        <div className="text-center space-y-2">
          <h1
            className="text-xl"
            style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
          >
            Welcome
          </h1>
          <p className="text-[8px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
            What would you like to do?
          </p>
        </div>

        {/* Balance display */}
        <div
          className="p-4 border-2 w-full max-w-xs text-center"
          style={{
            backgroundColor: '#0f0f24',
            borderImage: 'linear-gradient(135deg, #78ffd6, #667eea, #ffd700) 1',
            borderStyle: 'solid',
            borderWidth: '2px',
            boxShadow: '0 0 12px rgba(102, 126, 234, 0.1)',
          }}
        >
          <p className="text-[8px] uppercase mb-2" style={{ color: '#7a7a9a' }}>Your Balance</p>
          <p className="text-2xl" style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}>
            ${balance.toFixed(2)} <span className="text-xs" style={{ color: '#7a7a9a' }}>USDC</span>
          </p>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-xs">
          <ArcadeButton size="lg" variant="accent" onClick={() => setStep('select-amount')} className="w-full">
            Pay Vendor
          </ArcadeButton>
          <ArcadeButton size="lg" variant="primary" onClick={() => setStep('recharge')} className="w-full">
            Recharge Balance
          </ArcadeButton>
          <ArcadeButton size="md" variant="secondary" onClick={handleNewSession} className="w-full">
            End Session
          </ArcadeButton>
        </div>
      </div>
    )
  }

  // Select amount
  if (step === 'select-amount') {
    return (
      <div className="h-full flex flex-col p-4 gap-4">
        {/* Balance display */}
        <div
          className="p-4 border-2 text-center"
          style={{
            backgroundColor: '#0f0f24',
            borderImage: 'linear-gradient(135deg, #78ffd6, #667eea, #ffd700) 1',
            borderStyle: 'solid',
            borderWidth: '2px',
          }}
        >
          <p className="text-[8px] uppercase mb-2" style={{ color: '#7a7a9a' }}>Your Balance</p>
          <p className="text-2xl" style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}>
            ${balance.toFixed(2)} <span className="text-xs" style={{ color: '#7a7a9a' }}>USDC</span>
          </p>
        </div>

        {/* Amount selection */}
        <div className="text-center">
          <p className="text-[8px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
            Select Payment Amount
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 flex-1">
          {[5, 10, 15, 20, 25, 50].map((preset) => (
            <button
              key={preset}
              onClick={() => setAmount(preset.toString())}
              disabled={preset > balance}
              className="p-4 border-2 text-sm transition-all touch-active"
              style={{
                borderColor: amount === preset.toString() ? '#ffd700' : '#2a2a4a',
                backgroundColor: amount === preset.toString() ? 'rgba(255, 215, 0, 0.1)' : '#0f0f24',
                color: preset > balance ? '#3a3a5a' : amount === preset.toString() ? '#ffd700' : '#e0e8f0',
                opacity: preset > balance ? 0.4 : 1,
                boxShadow: amount === preset.toString() ? '0 0 8px rgba(255, 215, 0, 0.2)' : 'none',
              }}
            >
              ${preset}
            </button>
          ))}
        </div>

        {/* Low balance warning */}
        {balance < 10 && (
          <div
            className="p-3 border-2 text-center"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: '#ef4444' }}
          >
            <p className="text-[8px] uppercase" style={{ color: '#ef4444' }}>Low Balance</p>
            <button
              onClick={() => setStep('recharge')}
              className="text-[10px] underline mt-1"
              style={{ color: '#ffd700' }}
            >
              Recharge Now
            </button>
          </div>
        )}

        {/* Pay button */}
        <ArcadeButton
          size="lg"
          variant="accent"
          onClick={handlePayment}
          disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance}
          className="w-full"
        >
          {'Pay $'}{amount || '0'}
        </ArcadeButton>

        <ArcadeButton size="sm" variant="secondary" onClick={handleBackToMenu} className="w-full">
          Back
        </ArcadeButton>
      </div>
    )
  }

  // Idle
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 gap-8">
      <div className="text-center space-y-2">
        <h1
          className="text-xl"
          style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
        >
          Ready to Pay
        </h1>
        <p className="text-[8px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
          Tap your wristband to begin
        </p>
      </div>

      <NFCIndicator status="ready" />

      <ArcadeButton size="lg" variant="primary" onClick={handleTapNFC}>
        Tap NFC Wristband
      </ArcadeButton>

      <Link href="/app/festival" className="mt-4">
        <span className="text-[8px] uppercase tracking-wider transition-colors" style={{ color: '#7a7a9a' }}>
          Back
        </span>
      </Link>
    </div>
  )
}
