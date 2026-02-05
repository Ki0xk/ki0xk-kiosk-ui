'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArcadeButton } from '@/components/ki0xk/ArcadeButton'
import { NumericKeypad } from '@/components/ki0xk/NumericKeypad'
import { Modal } from '@/components/ki0xk/Modal'
import { NFCIndicator } from '@/components/ki0xk/NFCIndicator'
import { ProgressBar } from '@/components/ki0xk/ProgressBar'
import { mockScanNFC, mockUpdateCard } from '@/lib/mock'
import { PRESET_AMOUNTS, DEMO_PIN } from '@/lib/constants'

type Step = 'amount' | 'scan' | 'pin' | 'processing' | 'success'

export default function FestivalAdminPage() {
  const [step, setStep] = useState<Step>('amount')
  const [amount, setAmount] = useState('')
  const [pin, setPin] = useState('')
  const [cardId, setCardId] = useState('')
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinError, setPinError] = useState(false)

  const handlePresetAmount = (preset: number) => {
    setAmount(preset.toString())
  }

  const handleScanNFC = async () => {
    setStep('scan')
    try {
      const result = await mockScanNFC()
      if (result.success) {
        setCardId(result.cardId)
        setShowPinModal(true)
        setStep('pin')
      }
    } catch {
      setStep('amount')
    }
  }

  const handlePinSubmit = async () => {
    if (pin !== DEMO_PIN) {
      setPinError(true)
      setPin('')
      return
    }
    setPinError(false)
    setShowPinModal(false)
    setStep('processing')
    try {
      await mockUpdateCard(cardId, parseFloat(amount))
      setStep('success')
    } catch {
      setStep('amount')
    }
  }

  const handleReset = () => {
    setStep('amount')
    setAmount('')
    setPin('')
    setCardId('')
    setPinError(false)
  }

  // Success
  if (step === 'success') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 gap-6">
        <div
          className="w-20 h-20 flex items-center justify-center"
          style={{
            border: '4px solid #78ffd6',
            boxShadow: '0 0 12px rgba(120, 255, 214, 0.4), 0 0 24px rgba(120, 255, 214, 0.15)',
          }}
        >
          <span className="text-3xl" style={{ color: '#78ffd6' }}>OK</span>
        </div>

        <div className="text-center space-y-4">
          <h1
            className="text-lg"
            style={{ color: '#78ffd6', textShadow: '0 0 10px rgba(120, 255, 214, 0.5)' }}
          >
            Card Updated
          </h1>
          <div className="p-4 border-2" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
            <p className="text-[8px] uppercase mb-2" style={{ color: '#7a7a9a' }}>Card ID</p>
            <p className="text-[10px]" style={{ color: '#667eea' }}>{cardId}</p>
          </div>
          <p className="text-xl" style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}>
            +${amount} USDC
          </p>
        </div>

        <ArcadeButton size="md" variant="primary" onClick={handleReset} className="mt-4">
          New Transaction
        </ArcadeButton>
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
            Updating Card
          </h1>
          <p className="text-[8px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
            Please wait...
          </p>
        </div>
        <div className="w-full max-w-xs">
          <ProgressBar progress={0} isAnimating={true} />
        </div>
      </div>
    )
  }

  // Scan
  if (step === 'scan') {
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
            Hold card near reader
          </p>
        </div>
        <NFCIndicator status="scanning" />
        <ArcadeButton size="sm" variant="secondary" onClick={() => setStep('amount')}>
          Cancel
        </ArcadeButton>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-4 gap-4">
      {/* Header */}
      <div className="text-center">
        <h1
          className="text-sm"
          style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
        >
          Admin Panel
        </h1>
        <p className="text-[8px] uppercase tracking-wider mt-1" style={{ color: '#7a7a9a' }}>
          Load cards with USDC
        </p>
      </div>

      {/* Amount display */}
      <div
        className="p-4 border-2 text-center"
        style={{
          backgroundColor: '#0f0f24',
          borderImage: 'linear-gradient(135deg, #78ffd6, #667eea, #ffd700) 1',
          borderStyle: 'solid',
          borderWidth: '2px',
        }}
      >
        <p className="text-[8px] uppercase mb-2" style={{ color: '#7a7a9a' }}>Amount to Load</p>
        <p className="text-2xl" style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}>
          ${amount || '0'} <span className="text-xs" style={{ color: '#7a7a9a' }}>USDC</span>
        </p>
      </div>

      {/* Preset amounts */}
      <div className="grid grid-cols-5 gap-2">
        {PRESET_AMOUNTS.map((preset) => (
          <button
            key={preset}
            onClick={() => handlePresetAmount(preset)}
            className="p-2 border-2 text-[8px] transition-all touch-active"
            style={{
              borderColor: amount === preset.toString() ? '#ffd700' : '#2a2a4a',
              backgroundColor: amount === preset.toString() ? 'rgba(255, 215, 0, 0.1)' : '#0f0f24',
              color: amount === preset.toString() ? '#ffd700' : '#e0e8f0',
            }}
          >
            ${preset}
          </button>
        ))}
      </div>

      {/* Keypad */}
      <div className="flex-1 flex items-center justify-center">
        <NumericKeypad value={amount} onChange={setAmount} maxLength={4} />
      </div>

      {/* Scan button */}
      <ArcadeButton
        size="md"
        variant="accent"
        onClick={handleScanNFC}
        disabled={!amount || parseFloat(amount) <= 0}
        className="w-full"
      >
        Scan NFC Card
      </ArcadeButton>

      {/* Back */}
      <Link href="/app/festival" className="text-center">
        <span className="text-[8px] uppercase tracking-wider transition-colors" style={{ color: '#7a7a9a' }}>
          Back
        </span>
      </Link>

      {/* PIN Modal */}
      <Modal isOpen={showPinModal} onClose={() => setShowPinModal(false)} title="Enter Admin PIN">
        <div className="space-y-4">
          <p className="text-[8px] text-center uppercase mb-4" style={{ color: '#7a7a9a' }}>
            Demo PIN: 1234
          </p>
          <NumericKeypad value={pin} onChange={setPin} maxLength={4} isPin />
          {pinError && (
            <p className="text-[10px] text-center uppercase" style={{ color: '#ef4444' }}>
              Invalid PIN
            </p>
          )}
          <ArcadeButton
            size="md"
            variant="primary"
            onClick={handlePinSubmit}
            disabled={pin.length !== 4}
            className="w-full mt-4"
          >
            Confirm
          </ArcadeButton>
        </div>
      </Modal>
    </div>
  )
}
