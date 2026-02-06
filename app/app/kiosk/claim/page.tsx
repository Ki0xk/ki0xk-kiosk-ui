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

  const [step, setStep] = useState<ClaimStep>('enter-pin')
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
    return (
      <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
        {/* Title area */}
        <div className="text-center">
          <h1
            className="text-sm"
            style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
          >
            Enter Your PIN
          </h1>
          <p className="text-[8px] uppercase tracking-wider mt-1" style={{ color: '#7a7a9a' }}>
            6-digit PIN from your receipt
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center">
          <PinKeypad value={pin} onChange={setPin} maxLength={6} />
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <ArcadeButton
            size="md"
            variant="primary"
            onClick={() => {
              setError('')
              setStep('enter-wallet-id')
            }}
            disabled={pin.length !== 6}
            className="w-full"
          >
            Submit
          </ArcadeButton>

          <a href="/app/kiosk" className="text-center">
            <span className="text-[8px] uppercase tracking-wider transition-colors" style={{ color: '#7a7a9a' }}>
              Go Back
            </span>
          </a>
        </div>
      </div>
    )
  }

  // ── enter-wallet-id ────────────────────────────────────────────────────
  if (step === 'enter-wallet-id') {
    const handleWalletIdSubmit = async () => {
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
      <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
        {/* Title area */}
        <div className="text-center">
          <h1
            className="text-sm"
            style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
          >
            Enter Wallet ID
          </h1>
          <p className="text-[8px] uppercase tracking-wider mt-1" style={{ color: '#7a7a9a' }}>
            6-character code from your receipt
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center">
          <WalletIdKeypad value={walletId} onChange={setWalletId} maxLength={6} />
        </div>

        {/* Error message */}
        {error && (
          <div className="text-center">
            <p className="text-[9px] uppercase tracking-wider" style={{ color: '#ef4444' }}>
              {error}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <ArcadeButton
            size="md"
            variant="primary"
            onClick={handleWalletIdSubmit}
            disabled={walletId.length !== 6 || isProcessing}
            className="w-full"
          >
            {isProcessing ? 'Looking Up...' : 'Submit'}
          </ArcadeButton>

          <button
            onClick={() => {
              setError('')
              setWalletId('')
              setStep('enter-pin')
            }}
            className="text-center text-[8px] uppercase tracking-wider transition-colors"
            style={{ color: '#7a7a9a' }}
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // ── show-balance ───────────────────────────────────────────────────────
  if (step === 'show-balance') {
    return (
      <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
        {/* Title area */}
        <div className="text-center">
          <h1
            className="text-sm"
            style={{ color: '#78ffd6', textShadow: '0 0 10px rgba(120, 255, 214, 0.5)' }}
          >
            PIN Wallet Found
          </h1>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          {/* Wallet ID display */}
          <div>
            <p className="text-[8px] uppercase tracking-widest text-center mb-2" style={{ color: '#7a7a9a' }}>
              Wallet ID
            </p>
            <div className="flex justify-center gap-2">
              {walletId.split('').map((char, i) => (
                <div
                  key={i}
                  className="w-10 h-12 flex items-center justify-center text-lg"
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
            className="w-full max-w-xs p-6 text-center"
            style={{
              backgroundColor: '#0f0f24',
              border: '3px solid transparent',
              borderImage: 'linear-gradient(135deg, #78ffd6, #667eea, #f093fb, #ffd700) 1',
              boxShadow: '0 0 16px rgba(102, 126, 234, 0.2)',
            }}
          >
            <p className="text-[8px] uppercase tracking-widest mb-2" style={{ color: '#7a7a9a' }}>
              Available Balance
            </p>
            <p
              className="text-2xl"
              style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
            >
              ${walletAmount} USDC
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <ArcadeButton
            size="md"
            variant="primary"
            onClick={() => setStep('choose-destination')}
            className="w-full"
          >
            Claim Now
          </ArcadeButton>

          <button
            onClick={() => {
              setPin('')
              setWalletId('')
              setWalletAmount('')
              setError('')
              setStep('enter-pin')
            }}
            className="text-center text-[8px] uppercase tracking-wider transition-colors"
            style={{ color: '#7a7a9a' }}
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // ── choose-destination ─────────────────────────────────────────────────
  if (step === 'choose-destination') {
    return (
      <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
        {/* Title area */}
        <div className="text-center">
          <h1
            className="text-sm"
            style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
          >
            Where To Send?
          </h1>
          <p className="text-[8px] uppercase tracking-wider mt-1" style={{ color: '#7a7a9a' }}>
            Choose how to provide your destination
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 w-full max-w-xs mx-auto">
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
              className="block text-[7px] mt-1 tracking-widest"
              style={{ color: '#7a7a9a', opacity: 0.4 }}
            >
              Coming Soon
            </span>
          </ArcadeButton>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setStep('show-balance')}
            className="text-center text-[8px] uppercase tracking-wider transition-colors"
            style={{ color: '#7a7a9a' }}
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // ── qr-scan ────────────────────────────────────────────────────────────
  if (step === 'qr-scan') {
    return (
      <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
        {/* Title area */}
        <div className="text-center">
          <h1
            className="text-sm"
            style={{ color: '#78ffd6', textShadow: '0 0 10px rgba(120, 255, 214, 0.5)' }}
          >
            Scan QR Code
          </h1>
          <p className="text-[8px] uppercase tracking-wider mt-1" style={{ color: '#7a7a9a' }}>
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
      <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
        {/* Title area */}
        <div className="text-center">
          <h1
            className="text-sm"
            style={{ color: '#667eea', textShadow: '0 0 10px rgba(102, 126, 234, 0.5)' }}
          >
            Enter ENS
          </h1>
          <p className="text-[8px] uppercase tracking-wider mt-1" style={{ color: '#7a7a9a' }}>
            Type ENS or address
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center">
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

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              setDestinationAddress('')
              setStep('choose-destination')
            }}
            className="text-center text-[8px] uppercase tracking-wider transition-colors"
            style={{ color: '#7a7a9a' }}
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // ── select-chain ───────────────────────────────────────────────────────
  if (step === 'select-chain') {
    return (
      <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
        {/* Title area */}
        <div className="text-center">
          <h1
            className="text-sm"
            style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
          >
            Select Chain
          </h1>
          <p className="text-[8px] uppercase tracking-wider mt-1" style={{ color: '#7a7a9a' }}>
            Choose destination network
          </p>
        </div>

        {/* Destination preview */}
        <div
          className="p-3 border-2 text-center"
          style={{
            backgroundColor: '#0f0f24',
            borderColor: '#2a2a4a',
          }}
        >
          <p className="text-[7px] uppercase tracking-widest mb-1" style={{ color: '#7a7a9a' }}>
            Sending To
          </p>
          <p
            className="text-[10px] tracking-wide break-all"
            style={{ color: '#78ffd6', textShadow: '0 0 6px rgba(120, 255, 214, 0.3)' }}
          >
            {destinationAddress.length > 20
              ? destinationAddress.slice(0, 10) + '...' + destinationAddress.slice(-8)
              : destinationAddress}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <ChainSelector selectedChain={selectedChain} onSelect={setSelectedChain} />
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <ArcadeButton
            size="md"
            variant="primary"
            onClick={() => setStep('settling')}
            className="w-full"
          >
            {'Confirm & Send'}
          </ArcadeButton>

          <button
            onClick={() => setStep('choose-destination')}
            className="text-center text-[8px] uppercase tracking-wider transition-colors"
            style={{ color: '#7a7a9a' }}
          >
            Go Back
          </button>
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
      <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
        {/* Title area */}
        <div className="text-center">
          <h1
            className="text-sm"
            style={{ color: '#667eea', textShadow: '0 0 10px rgba(102, 126, 234, 0.5)' }}
          >
            Settling
          </h1>
          <p className="text-[8px] uppercase tracking-wider mt-1" style={{ color: '#7a7a9a' }}>
            Processing your claim...
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="w-full max-w-xs">
            <ProgressBar progress={0} isAnimating onComplete={handleSettlingComplete} />
          </div>

          <div className="text-center space-y-2">
            <p className="text-[9px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
              Claiming {walletAmount} USDC
            </p>
            <p className="text-[8px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
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
      <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
        {/* Title area */}
        <div className="text-center">
          <h1
            className="text-lg"
            style={{ color: '#78ffd6', textShadow: '0 0 10px rgba(120, 255, 214, 0.5)' }}
          >
            USDC Claimed!
          </h1>
        </div>

        {/* Content — receipt */}
        <div className="flex-1 flex items-center justify-center">
          <div
            className="w-full max-w-xs p-5"
            style={{
              backgroundColor: '#0f0f24',
              border: '3px solid transparent',
              borderImage: 'linear-gradient(135deg, #78ffd6, #667eea, #f093fb, #ffd700) 1',
              boxShadow: '0 0 20px rgba(120, 255, 214, 0.15)',
            }}
          >
            {/* Amount */}
            <div className="text-center mb-5">
              <p className="text-[7px] uppercase tracking-widest mb-1" style={{ color: '#7a7a9a' }}>
                Amount
              </p>
              <p
                className="text-xl"
                style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
              >
                ${claimResult?.amount || walletAmount} USDC
              </p>
            </div>

            {/* Divider */}
            <div className="mb-4" style={{ borderTop: '1px solid #2a2a4a' }} />

            {/* Destination */}
            <div className="mb-3">
              <p className="text-[7px] uppercase tracking-widest mb-1" style={{ color: '#7a7a9a' }}>
                Destination
              </p>
              <p
                className="text-[10px] tracking-wide break-all"
                style={{ color: '#78ffd6', textShadow: '0 0 6px rgba(120, 255, 214, 0.3)' }}
              >
                {truncatedAddress}
              </p>
            </div>

            {/* Chain */}
            <div className="mb-3">
              <p className="text-[7px] uppercase tracking-widest mb-1" style={{ color: '#7a7a9a' }}>
                Chain
              </p>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: '#667eea' }}>
                {SUPPORTED_CHAINS[selectedChain].name}
              </p>
            </div>

            {/* TX Hash */}
            <div className="mb-4">
              <p className="text-[7px] uppercase tracking-widest mb-1" style={{ color: '#7a7a9a' }}>
                TX Hash
              </p>
              <p className="text-[10px] tracking-wide" style={{ color: '#f093fb' }}>
                {truncatedTxHash}
              </p>
            </div>

            {/* QR Code for explorer link */}
            {explorerLink && (
              <>
                <div className="mb-3" style={{ borderTop: '1px solid #2a2a4a' }} />
                <div className="flex flex-col items-center gap-2">
                  <p className="text-[7px] uppercase tracking-widest" style={{ color: '#7a7a9a' }}>
                    Scan to verify on-chain
                  </p>
                  <div className="bg-white p-2 rounded">
                    <QRCodeSVG value={explorerLink} size={120} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <ArcadeButton
            size="md"
            variant="primary"
            onClick={() => {
              dispatch(actions.reset())
              router.push('/app/kiosk')
            }}
            className="w-full"
          >
            Done
          </ArcadeButton>
        </div>
      </div>
    )
  }

  return null
}
