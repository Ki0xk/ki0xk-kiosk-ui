'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useKi0xk, actions } from '@/lib/state'
import { SUPPORTED_CHAINS, type ChainKey, DEFAULT_CHAIN } from '@/lib/constants'
import {
  apiGetCardInfo,
  apiGetCardBalance,
  apiClaimPinWallet,
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
      <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
        <div className="text-center">
          <h1
            className="text-lg"
            style={{ color: '#667eea', textShadow: '0 0 10px rgba(102, 126, 234, 0.5)' }}
          >
            NFC Wallet
          </h1>
          <p className="text-[11px] uppercase tracking-widest mt-1" style={{ color: '#7a7a9a' }}>
            Tap your NFC card to check balance
          </p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <NFCIndicator status={nfcConnected ? 'scanning' : 'ready'} />

          <p className="text-sm uppercase tracking-wider" style={{ color: '#667eea' }}>
            {nfcConnected ? 'Ready — tap your card' : 'Waiting for NFC...'}
          </p>

          <p className="text-[11px] text-center" style={{ color: '#78ffd6' }}>
            Metro card, wristband, sticker, badge — any NFC chip
          </p>

          {error && (
            <p className="text-[13px] text-center px-4" style={{ color: '#ef4444' }}>
              {error}
            </p>
          )}
        </div>

        <a href="/app/kiosk" className="text-center">
          <span className="text-[11px] uppercase tracking-wider transition-colors" style={{ color: '#7a7a9a' }}>
            Back
          </span>
        </a>
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
        // Use the festival card system — verify PIN via lookup
        const result = await apiGetCardBalance(cardId)
        if (result.success && result.exists) {
          // PIN verification happens during claim, for now just show balance
          setStep('show-balance')
        } else {
          setError('Card not found')
        }
      } catch {
        setError('Verification failed')
      } finally {
        setIsProcessing(false)
      }
    }

    return (
      <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
        <div className="text-center">
          <h1
            className="text-lg"
            style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
          >
            Enter Your PIN
          </h1>
          <p className="text-[11px] uppercase tracking-widest mt-1" style={{ color: '#7a7a9a' }}>
            Enter the PIN you set for this card
          </p>
        </div>

        <div className="flex-1 flex flex-col gap-3">
          <div
            className="p-2 border-2 text-center"
            style={{
              backgroundColor: '#0f0f24',
              borderColor: '#667eea',
              boxShadow: '0 0 8px rgba(102, 126, 234, 0.15)',
            }}
          >
            <span className="text-[11px] uppercase tracking-widest" style={{ color: '#7a7a9a' }}>
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
            <p className="text-[13px] text-center" style={{ color: '#ef4444' }}>
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <ArcadeButton
            size="md"
            variant="primary"
            onClick={handleVerifyPin}
            disabled={pin.length < 4 || isProcessing}
            className="w-full"
          >
            {isProcessing ? 'Verifying...' : 'View Balance'}
          </ArcadeButton>

          <button
            onClick={() => {
              setPin('')
              setError('')
              setStep('nfc-tap')
            }}
            className="w-full text-[11px] uppercase tracking-wider py-2 transition-colors"
            style={{ color: '#7a7a9a' }}
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // show-balance
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'show-balance') {
    return (
      <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
        <div className="text-center">
          <h1
            className="text-lg"
            style={{ color: '#78ffd6', textShadow: '0 0 10px rgba(120, 255, 214, 0.5)' }}
          >
            NFC Wallet
          </h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          {/* Balance */}
          <div
            className="w-full max-w-xs p-6 text-center"
            style={{
              backgroundColor: '#0f0f24',
              border: '3px solid transparent',
              borderImage: 'linear-gradient(135deg, #78ffd6, #667eea, #f093fb, #ffd700) 1',
              boxShadow: '0 0 16px rgba(102, 126, 234, 0.2)',
            }}
          >
            <p className="text-[11px] uppercase tracking-widest mb-2" style={{ color: '#7a7a9a' }}>
              Available Balance
            </p>
            <p
              className="text-2xl"
              style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
            >
              ${balance} USDC
            </p>
          </div>

          {/* Stats */}
          <div className="w-full max-w-xs flex gap-3">
            <div
              className="flex-1 p-3 border-2 text-center"
              style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}
            >
              <p className="text-[10px] uppercase tracking-widest" style={{ color: '#7a7a9a' }}>
                Total Loaded
              </p>
              <p className="text-[15px]" style={{ color: '#78ffd6' }}>
                ${totalLoaded}
              </p>
            </div>
            <div
              className="flex-1 p-3 border-2 text-center"
              style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}
            >
              <p className="text-[10px] uppercase tracking-widest" style={{ color: '#7a7a9a' }}>
                Total Spent
              </p>
              <p className="text-[15px]" style={{ color: '#f093fb' }}>
                ${totalSpent}
              </p>
            </div>
          </div>

          {/* Card ID */}
          <div
            className="p-2 border-2 text-center w-full max-w-xs"
            style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}
          >
            <span className="text-[11px] uppercase tracking-widest" style={{ color: '#7a7a9a' }}>
              Card:{' '}
            </span>
            <span className="text-sm font-mono" style={{ color: '#667eea' }}>
              {cardId}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <ArcadeButton
            size="md"
            variant="primary"
            onClick={() => setStep('choose-destination')}
            disabled={parseFloat(balance) <= 0}
            className="w-full"
          >
            Withdraw to Wallet
          </ArcadeButton>

          <ArcadeButton
            size="sm"
            variant="secondary"
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

  // ──────────────────────────────────────────────────────────────────────────
  // choose-destination
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'choose-destination') {
    return (
      <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
        <div className="text-center">
          <h1
            className="text-lg"
            style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
          >
            Withdraw To
          </h1>
          <p className="text-[11px] uppercase tracking-widest mt-1" style={{ color: '#7a7a9a' }}>
            Where should we send your ${balance} USDC?
          </p>
        </div>

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

        <button
          onClick={() => setStep('show-balance')}
          className="w-full text-[11px] uppercase tracking-wider py-2 transition-colors"
          style={{ color: '#7a7a9a' }}
        >
          Back
        </button>
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
      <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
        <div className="text-center">
          <h1
            className="text-lg"
            style={{ color: '#667eea', textShadow: '0 0 10px rgba(102, 126, 234, 0.5)' }}
          >
            Enter ENS
          </h1>
        </div>
        <div className="flex-1">
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
        <button
          onClick={() => {
            setDestinationAddress('')
            setStep('choose-destination')
          }}
          className="w-full text-[11px] uppercase tracking-wider py-2 transition-colors"
          style={{ color: '#7a7a9a' }}
        >
          Back
        </button>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // select-chain
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'select-chain') {
    return (
      <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
        <div className="text-center">
          <h1
            className="text-lg"
            style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
          >
            Select Chain
          </h1>
        </div>

        <div
          className="p-3 border-2 text-center"
          style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}
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

        <div className="flex-1 overflow-y-auto">
          <ChainSelector selectedChain={selectedChain} onSelect={setSelectedChain} />
        </div>

        <div className="flex flex-col gap-3">
          <ArcadeButton
            size="md"
            variant="primary"
            onClick={() => setStep('settling')}
            className="w-full"
          >
            Confirm & Send
          </ArcadeButton>

          <button
            onClick={() => setStep('choose-destination')}
            className="w-full text-[11px] uppercase tracking-wider py-2 transition-colors"
            style={{ color: '#7a7a9a' }}
          >
            Back
          </button>
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
        const result = await apiClaimPinWallet(cardId, pin, destinationAddress, selectedChain)
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
          <p className="text-[11px] uppercase tracking-widest mt-1" style={{ color: '#7a7a9a' }}>
            Withdrawing from NFC wallet...
          </p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="w-full max-w-xs">
            <ProgressBar progress={0} isAnimating onComplete={handleSettleComplete} />
          </div>
          <p className="text-[11px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
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
      <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
        <div className="text-center">
          <h1
            className="text-lg"
            style={{ color: '#78ffd6', textShadow: '0 0 10px rgba(120, 255, 214, 0.5)' }}
          >
            Withdrawal Complete
          </h1>
          <div
            className="w-24 h-1 mx-auto mt-2"
            style={{
              background: 'linear-gradient(90deg, #78ffd6, #667eea, #764ba2, #f093fb, #ffd700)',
            }}
          />
        </div>

        <div className="flex-1 flex flex-col gap-3">
          <div
            className="flex items-center justify-between p-3 border-2"
            style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}
          >
            <span className="text-[13px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
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
            className="flex items-center justify-between p-3 border-2"
            style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}
          >
            <span className="text-[13px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
              Chain
            </span>
            <span className="text-[13px] uppercase tracking-wider" style={{ color: '#e0e8f0' }}>
              {SUPPORTED_CHAINS[selectedChain].name}
            </span>
          </div>

          {claimResult?.txHash && (
            <div
              className="flex items-center justify-between p-3 border-2"
              style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}
            >
              <span className="text-[13px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
                TX Hash
              </span>
              <span className="text-[11px] font-mono" style={{ color: '#ffd700' }}>
                {claimResult.txHash.slice(0, 10) + '...' + claimResult.txHash.slice(-6)}
              </span>
            </div>
          )}

          {claimResult?.explorerUrl && (
            <div className="flex flex-col items-center gap-2 p-3 border-2" style={{
              backgroundColor: '#0f0f24', borderColor: '#2a2a4a',
            }}>
              <span className="text-[13px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
                Scan to verify
              </span>
              <div className="bg-white p-2 rounded">
                <QRCodeSVG value={claimResult.explorerUrl} size={120} />
              </div>
            </div>
          )}
        </div>

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
    )
  }

  return null
}
