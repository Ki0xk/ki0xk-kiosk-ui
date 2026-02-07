'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useKi0xk, actions } from '@/lib/state'
import { SUPPORTED_CHAINS, type ChainKey, DEFAULT_CHAIN } from '@/lib/constants'
import { apiLookupPinWallet, apiClaimPinWallet } from '@/lib/api-client'
import { QRCodeSVG } from 'qrcode.react'
import { ArcadeButton } from '@/components/ki0xk/ArcadeButton'
import { PinKeypad } from '@/components/ki0xk/PinKeypad'
import { WalletIdKeypad } from '@/components/ki0xk/WalletIdKeypad'
import { QrScanner } from '@/components/ki0xk/QrScanner'
import { OnScreenKeyboard } from '@/components/ki0xk/OnScreenKeyboard'
import { ChainSelector } from '@/components/ki0xk/ChainSelector'
import { ProgressBar } from '@/components/ki0xk/ProgressBar'

type ClaimStep =
  | 'enter-pin'
  | 'enter-wallet-id'
  | 'show-balance'
  | 'choose-destination'
  | 'qr-scan'
  | 'ens-input'
  | 'select-chain'
  | 'settling'
  | 'done'

export default function ClaimPage() {
  const router = useRouter()
  const { dispatch } = useKi0xk()

  const [step, setStep] = useState<ClaimStep>('enter-wallet-id')
  const [pin, setPin] = useState('')
  const [walletId, setWalletId] = useState('')
  const [walletAmount, setWalletAmount] = useState('')
  const [destinationAddress, setDestinationAddress] = useState('')
  const [selectedChain, setSelectedChain] = useState<ChainKey>(DEFAULT_CHAIN)
  const [error, setError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const claimingStarted = useRef(false)

  // Settlement result stored locally for done screen
  const [claimResult, setClaimResult] = useState<{
    amount: string
    txHash: string
    explorerUrl?: string
  } | null>(null)

  // ── enter-pin ──────────────────────────────────────────────────────────
  if (step === 'enter-pin') {
    const handlePinSubmit = async () => {
      setIsProcessing(true)
      setError('')
      try {
        const result = await apiLookupPinWallet(walletId, pin)
        if (result.success) {
          setWalletAmount(result.amount)
          setStep('show-balance')
        } else {
          setError(result.message)
        }
      } catch {
        setError('Lookup failed. Please try again.')
      } finally {
        setIsProcessing(false)
      }
    }

    return (
      <div className="h-full flex flex-col p-2 gap-1 overflow-hidden">
        {/* iOS-style header: Back | Title | Submit */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => { setError(''); setPin(''); setStep('enter-wallet-id') }}
            className="text-[11px] uppercase tracking-wider px-2 py-0.5 border"
            style={{ color: '#7a7a9a', borderColor: '#7a7a9a' }}
          >
            ‹ Back
          </button>
          <h1
            className="text-sm"
            style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
          >
            Enter PIN
          </h1>
          <button
            onClick={handlePinSubmit}
            disabled={pin.length !== 6 || isProcessing}
            className="text-[11px] uppercase tracking-wider px-2 py-0.5 border"
            style={{ color: pin.length === 6 && !isProcessing ? '#78ffd6' : '#3a3a5a', borderColor: pin.length === 6 && !isProcessing ? '#78ffd6' : '#3a3a5a' }}
          >
            {isProcessing ? 'Wait...' : 'Submit ›'}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center min-h-0">
          <PinKeypad value={pin} onChange={setPin} maxLength={6} />
        </div>

        {/* Error message */}
        {error && (
          <div className="text-center">
            <p className="text-[13px] uppercase tracking-wider" style={{ color: '#ef4444' }}>
              {error}
            </p>
          </div>
        )}
      </div>
    )
  }

  // ── enter-wallet-id ────────────────────────────────────────────────────
  if (step === 'enter-wallet-id') {
    return (
      <div className="h-full flex flex-col p-2 gap-1 overflow-hidden">
        {/* iOS-style header: Back | Title | Next */}
        <div className="flex items-center justify-between px-1">
          <a href="/app/kiosk" className="text-[11px] uppercase tracking-wider px-2 py-0.5 border" style={{ color: '#7a7a9a', borderColor: '#7a7a9a' }}>
            ‹ Back
          </a>
          <h1
            className="text-sm"
            style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
          >
            Wallet ID
          </h1>
          <button
            onClick={() => { setError(''); setStep('enter-pin') }}
            disabled={walletId.length !== 6}
            className="text-[11px] uppercase tracking-wider px-2 py-0.5 border"
            style={{ color: walletId.length === 6 ? '#78ffd6' : '#3a3a5a', borderColor: walletId.length === 6 ? '#78ffd6' : '#3a3a5a' }}
          >
            Next ›
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center min-h-0">
          <WalletIdKeypad value={walletId} onChange={setWalletId} maxLength={6} />
        </div>
      </div>
    )
  }

  // ── show-balance ───────────────────────────────────────────────────────
  if (step === 'show-balance') {
    return (
      <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
        {/* iOS-style header: Back | Title | Claim */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => {
              setPin('')
              setWalletId('')
              setWalletAmount('')
              setError('')
              setStep('enter-wallet-id')
            }}
            className="text-[11px] uppercase tracking-wider px-2 py-0.5 border"
            style={{ color: '#7a7a9a', borderColor: '#7a7a9a' }}
          >
            ‹ Back
          </button>
          <h1
            className="text-sm"
            style={{ color: '#78ffd6', textShadow: '0 0 10px rgba(120, 255, 214, 0.5)' }}
          >
            Wallet Found
          </h1>
          <button
            onClick={() => setStep('choose-destination')}
            className="text-[11px] uppercase tracking-wider px-2 py-0.5 border"
            style={{ color: '#78ffd6', borderColor: '#78ffd6' }}
          >
            Claim ›
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-0">
          {/* Wallet ID display */}
          <div>
            <p className="text-[11px] uppercase tracking-widest text-center mb-1" style={{ color: '#7a7a9a' }}>
              Wallet ID
            </p>
            <div className="flex justify-center gap-1.5">
              {walletId.split('').map((char, i) => (
                <div
                  key={i}
                  className="w-8 h-10 flex items-center justify-center text-base"
                  style={{
                    backgroundColor: '#141430',
                    border: '2px solid #667eea',
                    color: '#667eea',
                    textShadow: '0 0 8px rgba(102, 126, 234, 0.4)',
                    boxShadow: '0 0 8px rgba(102, 126, 234, 0.15)',
                  }}
                >
                  {char}
                </div>
              ))}
            </div>
          </div>

          {/* Amount display — holographic border */}
          <div
            className="w-full max-w-xs p-4 text-center"
            style={{
              backgroundColor: '#0f0f24',
              border: '3px solid transparent',
              borderImage: 'linear-gradient(135deg, #78ffd6, #667eea, #f093fb, #ffd700) 1',
              boxShadow: '0 0 16px rgba(102, 126, 234, 0.2)',
            }}
          >
            <p className="text-[11px] uppercase tracking-widest mb-1" style={{ color: '#7a7a9a' }}>
              Available Balance
            </p>
            <p
              className="text-xl"
              style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
            >
              ${walletAmount} USDC
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── choose-destination ─────────────────────────────────────────────────
  if (step === 'choose-destination') {
    return (
      <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
        {/* iOS-style header: Back | Title | spacer */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => setStep('show-balance')}
            className="text-[11px] uppercase tracking-wider px-2 py-0.5 border"
            style={{ color: '#7a7a9a', borderColor: '#7a7a9a' }}
          >
            ‹ Back
          </button>
          <h1
            className="text-sm"
            style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
          >
            Where To Send?
          </h1>
          <span className="w-12" />
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 w-full max-w-xs mx-auto">
          <ArcadeButton
            size="lg"
            variant="primary"
            onClick={() => setStep('qr-scan')}
            className="w-full"
          >
            Scan QR Code
          </ArcadeButton>

          <ArcadeButton
            size="lg"
            variant="secondary"
            onClick={() => setStep('ens-input')}
            className="w-full"
          >
            Enter ENS Name
          </ArcadeButton>

          <ArcadeButton
            size="lg"
            variant="secondary"
            disabled
            className="w-full"
          >
            <span style={{ opacity: 0.4 }}>
              Tap NFC
            </span>
            <span
              className="block text-[10px] mt-1 tracking-widest"
              style={{ color: '#7a7a9a', opacity: 0.4 }}
            >
              Coming Soon
            </span>
          </ArcadeButton>
        </div>
      </div>
    )
  }

  // ── qr-scan ────────────────────────────────────────────────────────────
  if (step === 'qr-scan') {
    return (
      <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
        {/* Title area */}
        <div className="text-center">
          <h1
            className="text-sm"
            style={{ color: '#78ffd6', textShadow: '0 0 10px rgba(120, 255, 214, 0.5)' }}
          >
            Scan QR Code
          </h1>
          <p className="text-[11px] uppercase tracking-wider mt-1" style={{ color: '#7a7a9a' }}>
            Point camera at your wallet QR
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center">
          <QrScanner
            onScan={(address) => {
              setDestinationAddress(address)
              setStep('select-chain')
            }}
            onClose={() => setStep('choose-destination')}
          />
        </div>
      </div>
    )
  }

  // ── ens-input ──────────────────────────────────────────────────────────
  if (step === 'ens-input') {
    return (
      <div className="h-full flex flex-col p-2 gap-1 overflow-hidden">
        {/* iOS-style header: Back | Title | (spacer) */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => { setDestinationAddress(''); setStep('choose-destination') }}
            className="text-[11px] uppercase tracking-wider px-2 py-0.5 border"
            style={{ color: '#7a7a9a', borderColor: '#7a7a9a' }}
          >
            ‹ Back
          </button>
          <h1
            className="text-sm"
            style={{ color: '#667eea', textShadow: '0 0 10px rgba(102, 126, 234, 0.5)' }}
          >
            Enter ENS
          </h1>
          <span className="w-12" />
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0">
          <OnScreenKeyboard
            value={destinationAddress}
            onChange={setDestinationAddress}
            onSubmit={() => {
              if (destinationAddress) {
                setStep('select-chain')
              }
            }}
            placeholder="yourname.eth or 0x..."
          />
        </div>
      </div>
    )
  }

  // ── select-chain ───────────────────────────────────────────────────────
  if (step === 'select-chain') {
    return (
      <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
        {/* iOS-style header: Back | Title | Send */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => setStep('choose-destination')}
            className="text-[11px] uppercase tracking-wider px-2 py-0.5 border"
            style={{ color: '#7a7a9a', borderColor: '#7a7a9a' }}
          >
            ‹ Back
          </button>
          <h1
            className="text-sm"
            style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
          >
            Select Chain
          </h1>
          <button
            onClick={() => setStep('settling')}
            className="text-[11px] uppercase tracking-wider px-2 py-0.5 border"
            style={{ color: '#78ffd6', borderColor: '#78ffd6' }}
          >
            Send ›
          </button>
        </div>

        {/* Destination preview */}
        <div
          className="p-2 border-2 text-center"
          style={{
            backgroundColor: '#0f0f24',
            borderColor: '#2a2a4a',
          }}
        >
          <span className="text-[11px] uppercase tracking-widest" style={{ color: '#7a7a9a' }}>
            Sending to:{' '}
          </span>
          <span className="text-[13px] font-mono" style={{ color: '#78ffd6' }}>
            {destinationAddress.length > 20
              ? destinationAddress.slice(0, 10) + '...' + destinationAddress.slice(-8)
              : destinationAddress}
          </span>
        </div>

        {/* Content — chain list needs scroll for 7 chains */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <ChainSelector selectedChain={selectedChain} onSelect={setSelectedChain} />
        </div>
      </div>
    )
  }

  // ── settling ───────────────────────────────────────────────────────────
  if (step === 'settling') {
    const handleSettlingComplete = async () => {
      if (claimingStarted.current) return
      claimingStarted.current = true
      try {
        const result = await apiClaimPinWallet(walletId, pin, destinationAddress, selectedChain)
        if (result.success) {
          setClaimResult({
            amount: result.amount,
            txHash: result.bridgeResult?.txHash || '0x' + '0'.repeat(64),
            explorerUrl: result.bridgeResult?.explorerUrl,
          })
          setStep('done')
        } else {
          setError(result.message)
          claimingStarted.current = false
          setStep('show-balance')
        }
      } catch {
        setError('Claim failed. Please try again.')
        claimingStarted.current = false
        setStep('show-balance')
      }
    }

    return (
      <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
        {/* Title area */}
        <div className="text-center">
          <h1
            className="text-sm"
            style={{ color: '#667eea', textShadow: '0 0 10px rgba(102, 126, 234, 0.5)' }}
          >
            Settling
          </h1>
          <p className="text-[11px] uppercase tracking-wider mt-1" style={{ color: '#7a7a9a' }}>
            Processing your claim...
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="w-full max-w-xs">
            <ProgressBar progress={0} isAnimating onComplete={handleSettlingComplete} />
          </div>

          <div className="text-center space-y-2">
            <p className="text-[13px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
              Claiming {walletAmount} USDC
            </p>
            <p className="text-[11px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
              {SUPPORTED_CHAINS[selectedChain].name}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── done ───────────────────────────────────────────────────────────────
  if (step === 'done') {
    const truncatedAddress =
      destinationAddress.length > 20
        ? destinationAddress.slice(0, 10) + '...' + destinationAddress.slice(-8)
        : destinationAddress

    const truncatedTxHash = claimResult?.txHash
      ? claimResult.txHash.slice(0, 10) + '...' + claimResult.txHash.slice(-8)
      : ''

    const explorerLink = claimResult?.explorerUrl || null

    return (
      <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
        {/* iOS-style header */}
        <div className="flex items-center justify-between px-1">
          <span className="w-12" />
          <h1
            className="text-sm"
            style={{ color: '#78ffd6', textShadow: '0 0 10px rgba(120, 255, 214, 0.5)' }}
          >
            Claimed!
          </h1>
          <button
            onClick={() => {
              dispatch(actions.reset())
              router.push('/app/kiosk')
            }}
            className="text-[11px] uppercase tracking-wider px-2 py-0.5 border"
            style={{ color: '#78ffd6', borderColor: '#78ffd6' }}
          >
            Done ›
          </button>
        </div>

        {/* Receipt — two-column layout */}
        <div className="flex-1 flex gap-3 min-h-0">
          {/* Left: receipt details */}
          <div className="flex-1 flex flex-col gap-1.5">
            {[
              { label: 'Amount', value: `$${claimResult?.amount || walletAmount} USDC`, color: '#ffd700' },
              { label: 'To', value: truncatedAddress, color: '#78ffd6' },
              { label: 'Chain', value: SUPPORTED_CHAINS[selectedChain].name, color: '#667eea' },
              { label: 'TX', value: truncatedTxHash, color: '#f093fb' },
            ].map((row, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-2 py-1.5 border"
                style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}
              >
                <span className="text-[11px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
                  {row.label}
                </span>
                <span className="text-[13px]" style={{ color: row.color }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {/* Right: QR code */}
          {explorerLink && (
            <div
              className="flex flex-col items-center justify-center gap-1 px-3 border"
              style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}
            >
              <span className="text-[10px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
                Verify
              </span>
              <div className="bg-white p-1.5">
                <QRCodeSVG value={explorerLink} size={80} />
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}
