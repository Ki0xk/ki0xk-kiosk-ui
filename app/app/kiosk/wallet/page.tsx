'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useKi0xk, actions } from '@/lib/state'
import { SUPPORTED_CHAINS, type ChainKey, DEFAULT_CHAIN } from '@/lib/constants'
import {
  apiGetCardInfo,
  apiVerifyCardPin,
  apiClaimNfcCard,
} from '@/lib/api-client'
import { useNfcEvents } from '@/hooks/use-nfc-events'
import { QRCodeSVG } from 'qrcode.react'
import { ArcadeButton } from '@/components/ki0xk/ArcadeButton'
import { NFCIndicator } from '@/components/ki0xk/NFCIndicator'
import { NumericKeypad } from '@/components/ki0xk/NumericKeypad'
import { QrScanner } from '@/components/ki0xk/QrScanner'
import { OnScreenKeyboard } from '@/components/ki0xk/OnScreenKeyboard'
import { ChainSelector } from '@/components/ki0xk/ChainSelector'
import { ProgressBar } from '@/components/ki0xk/ProgressBar'

type WalletStep =
  | 'nfc-tap'
  | 'enter-pin'
  | 'show-balance'
  | 'choose-destination'
  | 'qr-scan'
  | 'ens-input'
  | 'select-chain'
  | 'settling'
  | 'done'

export default function NfcWalletPage() {
  const router = useRouter()
  const { dispatch } = useKi0xk()

  const [step, setStep] = useState<WalletStep>('nfc-tap')
  const [cardId, setCardId] = useState('')
  const [pin, setPin] = useState('')
  const [balance, setBalance] = useState('')
  const [totalLoaded, setTotalLoaded] = useState('')
  const [totalSpent, setTotalSpent] = useState('')
  const [destinationAddress, setDestinationAddress] = useState('')
  const [selectedChain, setSelectedChain] = useState<ChainKey>(DEFAULT_CHAIN)
  const [error, setError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const claimingStarted = useRef(false)

  const [claimResult, setClaimResult] = useState<{
    amount: string
    txHash: string
    explorerUrl?: string
  } | null>(null)

  const { connected: nfcConnected } = useNfcEvents({
    enabled: step === 'nfc-tap',
    onCardTapped: async (uid) => {
      if (step !== 'nfc-tap') return
      setCardId(uid)
      setError('')
      try {
        const info = await apiGetCardInfo(uid)
        if (info.success && info.hasPin) {
          setBalance(info.balance)
          setTotalLoaded(info.totalLoaded)
          setTotalSpent(info.totalSpent)
          setStep('enter-pin')
        } else {
          setError('This card has no PIN set. Use "Buy Crypto" to set up a new card.')
        }
      } catch {
        setError('Card not found. Use "Buy Crypto" to create a new NFC wallet.')
      }
    },
  })

  // ──────────────────────────────────────────────────────────────────────────
  // nfc-tap — waiting for card
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'nfc-tap') {
    return (
      <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
        {/* iOS-style header: Back | Title | spacer */}
        <div className="flex items-center justify-between px-1">
          <a
            href="/app/kiosk"
            className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
            style={{ color: '#7a7a9a', borderColor: '#7a7a9a' }}
          >
            ‹ Back
          </a>
          <h1
            className="text-sm"
            style={{ color: '#667eea', textShadow: '0 0 10px rgba(102, 126, 234, 0.5)' }}
          >
            NFC Wallet
          </h1>
          <span className="w-12" />
        </div>

        <p className="text-[0.6875rem] uppercase tracking-widest text-center" style={{ color: '#7a7a9a' }}>
          Tap your NFC card to check balance
        </p>

        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <NFCIndicator status={nfcConnected ? 'scanning' : 'ready'} />

          <p className="text-sm uppercase tracking-wider" style={{ color: '#667eea' }}>
            {nfcConnected ? 'Ready — tap your card' : 'Waiting for NFC...'}
          </p>

          <p className="text-[0.6875rem] text-center" style={{ color: '#78ffd6' }}>
            Metro card, wristband, sticker, badge — any NFC chip
          </p>

          {error && (
            <p className="text-[0.8125rem] text-center px-4" style={{ color: '#ef4444' }}>
              {error}
            </p>
          )}
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // enter-pin — verify card ownership
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'enter-pin') {
    const handleVerifyPin = async () => {
      setIsProcessing(true)
      setError('')
      try {
        const result = await apiVerifyCardPin(cardId, pin)
        if (result.success) {
          setBalance(result.balance)
          setTotalLoaded(result.totalLoaded)
          setTotalSpent(result.totalSpent)
          setStep('show-balance')
        } else {
          setError(result.message || 'Invalid PIN')
        }
      } catch {
        setError('Invalid PIN')
      } finally {
        setIsProcessing(false)
      }
    }

    return (
      <div className="h-full flex flex-col p-2 gap-1 overflow-hidden">
        {/* iOS-style header: Back | Title | Go */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => { setPin(''); setError(''); setStep('nfc-tap') }}
            className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
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
            onClick={handleVerifyPin}
            disabled={pin.length < 4 || isProcessing}
            className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
            style={{ color: pin.length >= 4 && !isProcessing ? '#ffd700' : '#3a3a5a', borderColor: pin.length >= 4 && !isProcessing ? '#ffd700' : '#3a3a5a' }}
          >
            {isProcessing ? 'Wait...' : 'Go ›'}
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-1 min-h-0">
          <div
            className="p-1 border-2 text-center"
            style={{
              backgroundColor: '#0f0f24',
              borderColor: '#667eea',
              boxShadow: '0 0 8px rgba(102, 126, 234, 0.15)',
            }}
          >
            <span className="text-[0.6875rem] uppercase tracking-widest" style={{ color: '#7a7a9a' }}>
              Card:{' '}
            </span>
            <span className="text-sm font-mono" style={{ color: '#667eea' }}>
              {cardId.length > 12 ? cardId.slice(0, 6) + '...' + cardId.slice(-4) : cardId}
            </span>
          </div>

          <NumericKeypad
            value={pin}
            onChange={setPin}
            maxLength={6}
            isPin
          />

          {error && (
            <p className="text-[0.8125rem] text-center" style={{ color: '#ef4444' }}>
              {error}
            </p>
          )}
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // show-balance
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'show-balance') {
    return (
      <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
        {/* iOS-style header: Done | Title | Withdraw */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => {
              dispatch(actions.reset())
              router.push('/app/kiosk')
            }}
            className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
            style={{ color: '#7a7a9a', borderColor: '#7a7a9a' }}
          >
            ‹ Done
          </button>
          <h1
            className="text-sm"
            style={{ color: '#78ffd6', textShadow: '0 0 10px rgba(120, 255, 214, 0.5)' }}
          >
            NFC Wallet
          </h1>
          <button
            onClick={() => setStep('choose-destination')}
            disabled={parseFloat(balance) <= 0}
            className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
            style={{ color: parseFloat(balance) > 0 ? '#ffd700' : '#3a3a5a', borderColor: parseFloat(balance) > 0 ? '#ffd700' : '#3a3a5a' }}
          >
            Send ›
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-3 min-h-0">
          {/* Balance */}
          <div
            className="w-full max-w-xs p-4 text-center"
            style={{
              backgroundColor: '#0f0f24',
              border: '3px solid transparent',
              borderImage: 'linear-gradient(135deg, #78ffd6, #667eea, #f093fb, #ffd700) 1',
              boxShadow: '0 0 16px rgba(102, 126, 234, 0.2)',
            }}
          >
            <p className="text-[0.6875rem] uppercase tracking-widest mb-1" style={{ color: '#7a7a9a' }}>
              Available Balance
            </p>
            <p
              className="text-xl"
              style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
            >
              ${balance} USDC
            </p>
          </div>

          {/* Stats */}
          <div className="w-full max-w-xs flex gap-2">
            <div
              className="flex-1 p-2 border-2 text-center"
              style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}
            >
              <p className="text-[0.625rem] uppercase tracking-widest" style={{ color: '#7a7a9a' }}>
                Loaded
              </p>
              <p className="text-[0.8125rem]" style={{ color: '#78ffd6' }}>
                ${totalLoaded}
              </p>
            </div>
            <div
              className="flex-1 p-2 border-2 text-center"
              style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}
            >
              <p className="text-[0.625rem] uppercase tracking-widest" style={{ color: '#7a7a9a' }}>
                Spent
              </p>
              <p className="text-[0.8125rem]" style={{ color: '#f093fb' }}>
                ${totalSpent}
              </p>
            </div>
          </div>

          {/* Card ID */}
          <div
            className="p-1.5 border-2 text-center w-full max-w-xs"
            style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}
          >
            <span className="text-[0.6875rem] uppercase tracking-widest" style={{ color: '#7a7a9a' }}>
              Card:{' '}
            </span>
            <span className="text-sm font-mono" style={{ color: '#667eea' }}>
              {cardId}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // choose-destination
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'choose-destination') {
    return (
      <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
        {/* iOS-style header: Back | Title | spacer */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => setStep('show-balance')}
            className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
            style={{ color: '#7a7a9a', borderColor: '#7a7a9a' }}
          >
            ‹ Back
          </button>
          <h1
            className="text-sm"
            style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
          >
            Withdraw To
          </h1>
          <span className="w-12" />
        </div>

        <p className="text-[0.6875rem] uppercase tracking-widest text-center" style={{ color: '#7a7a9a' }}>
          Where should we send your ${balance} USDC?
        </p>

        <div className="flex-1 flex flex-col gap-3 justify-center">
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
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // qr-scan
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'qr-scan') {
    return (
      <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
        <div className="text-center">
          <h1
            className="text-lg"
            style={{ color: '#78ffd6', textShadow: '0 0 10px rgba(120, 255, 214, 0.5)' }}
          >
            Scan QR
          </h1>
        </div>
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

  // ──────────────────────────────────────────────────────────────────────────
  // ens-input
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'ens-input') {
    return (
      <div className="h-full flex flex-col p-2 gap-1 overflow-hidden">
        {/* iOS-style header: Back | Title | (spacer) */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => { setDestinationAddress(''); setStep('choose-destination') }}
            className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
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
        <div className="flex-1 min-h-0">
          <OnScreenKeyboard
            value={destinationAddress}
            onChange={setDestinationAddress}
            onSubmit={() => {
              if (destinationAddress) setStep('select-chain')
            }}
            placeholder="vitalik.eth or 0x..."
            maxLength={42}
          />
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // select-chain
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'select-chain') {
    return (
      <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
        {/* iOS-style header: Back | Title | Send */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => setStep('choose-destination')}
            className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
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
            className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
            style={{ color: '#ffd700', borderColor: '#ffd700' }}
          >
            Send ›
          </button>
        </div>

        <div
          className="p-2 border-2 text-center"
          style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}
        >
          <span className="text-[0.6875rem] uppercase tracking-widest" style={{ color: '#7a7a9a' }}>
            Sending to:{' '}
          </span>
          <span className="text-[0.8125rem] font-mono" style={{ color: '#78ffd6' }}>
            {destinationAddress.length > 20
              ? destinationAddress.slice(0, 10) + '...' + destinationAddress.slice(-8)
              : destinationAddress}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <ChainSelector selectedChain={selectedChain} onSelect={setSelectedChain} />
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // settling — claim NFC card balance to external wallet
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'settling') {
    const handleSettleComplete = async () => {
      if (claimingStarted.current) return
      claimingStarted.current = true
      try {
        // Use the PIN wallet claim flow — same backend, NFC card walletId acts like walletId
        const result = await apiClaimNfcCard(cardId, pin, destinationAddress, selectedChain)
        if (result.success) {
          setClaimResult({
            amount: result.amount,
            txHash: result.bridgeResult?.txHash || '',
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
        <div className="text-center">
          <h1
            className="text-lg"
            style={{ color: '#667eea', textShadow: '0 0 10px rgba(102, 126, 234, 0.5)' }}
          >
            Settling
          </h1>
          <p className="text-[0.6875rem] uppercase tracking-widest mt-1" style={{ color: '#7a7a9a' }}>
            Withdrawing from NFC wallet...
          </p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="w-full max-w-xs">
            <ProgressBar progress={0} isAnimating onComplete={handleSettleComplete} />
          </div>
          <p className="text-[0.6875rem] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
            Bridging ${balance} USDC to {SUPPORTED_CHAINS[selectedChain].name}...
          </p>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // done
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
        {/* iOS-style header */}
        <div className="flex items-center justify-between px-1">
          <span className="w-12" />
          <h1
            className="text-sm"
            style={{ color: '#78ffd6', textShadow: '0 0 10px rgba(120, 255, 214, 0.5)' }}
          >
            Withdrawn
          </h1>
          <button
            onClick={() => {
              dispatch(actions.reset())
              router.push('/app/kiosk')
            }}
            className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
            style={{ color: '#ffd700', borderColor: '#ffd700' }}
          >
            Done ›
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-1.5 min-h-0">
          <div
            className="flex items-center justify-between p-2 border-2"
            style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}
          >
            <span className="text-[0.6875rem] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
              Amount
            </span>
            <span
              className="text-sm"
              style={{ color: '#78ffd6', textShadow: '0 0 8px rgba(120, 255, 214, 0.4)' }}
            >
              ${claimResult?.amount || balance} USDC
            </span>
          </div>

          <div
            className="flex items-center justify-between p-2 border-2"
            style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}
          >
            <span className="text-[0.6875rem] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
              Chain
            </span>
            <span className="text-[0.6875rem] uppercase tracking-wider" style={{ color: '#e0e8f0' }}>
              {SUPPORTED_CHAINS[selectedChain].name}
            </span>
          </div>

          {claimResult?.txHash && (
            <div
              className="flex items-center justify-between p-2 border-2"
              style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}
            >
              <span className="text-[0.6875rem] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
                TX Hash
              </span>
              <span className="text-[0.6875rem] font-mono" style={{ color: '#ffd700' }}>
                {claimResult.txHash.slice(0, 10) + '...' + claimResult.txHash.slice(-6)}
              </span>
            </div>
          )}

          {claimResult?.explorerUrl && (
            <div className="flex flex-col items-center gap-1 p-2 border-2" style={{
              backgroundColor: '#0f0f24', borderColor: '#2a2a4a',
            }}>
              <span className="text-[0.6875rem] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
                Scan to verify
              </span>
              <div className="bg-white p-1.5">
                <QRCodeSVG value={claimResult.explorerUrl} size={80} />
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}
