'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useKi0xk, actions } from '@/lib/state'
import { SUPPORTED_ASSETS, SUPPORTED_CHAINS, calculateFee, type ChainKey, DEFAULT_CHAIN } from '@/lib/constants'
import {
  apiStartSession, apiDepositToSession, apiEndSession, apiSessionToPin,
  apiCreateCardWithId, apiSetCardPin, apiTopUpCard, apiGetCardInfo,
} from '@/lib/api-client'
import { getModeFeatures } from '@/lib/mode'
import { useCoinEvents } from '@/hooks/use-coin-events'
import { useNfcEvents } from '@/hooks/use-nfc-events'
import { QRCodeSVG } from 'qrcode.react'
import { ArcadeButton } from '@/components/ki0xk/ArcadeButton'
import { CoinSlotSimulator } from '@/components/ki0xk/CoinSlotSimulator'
import { QrScanner } from '@/components/ki0xk/QrScanner'
import { OnScreenKeyboard } from '@/components/ki0xk/OnScreenKeyboard'
import { ChainSelector } from '@/components/ki0xk/ChainSelector'
import { PinDisplay } from '@/components/ki0xk/PinDisplay'
import { NFCIndicator } from '@/components/ki0xk/NFCIndicator'
import { NumericKeypad } from '@/components/ki0xk/NumericKeypad'
import { ProgressBar } from '@/components/ki0xk/ProgressBar'

type BuyStep =
  | 'select-asset'
  | 'processing'
  | 'insert-coins'
  | 'confirm-amount'
  | 'choose-destination'
  | 'qr-scan'
  | 'ens-input'
  | 'select-chain'
  | 'settling'
  | 'done'
  | 'pin-generated'
  | 'nfc-tap'
  | 'nfc-pin'
  | 'nfc-done'

export default function BuyPage() {
  const router = useRouter()
  const { state, dispatch } = useKi0xk()

  const [step, setStep] = useState<BuyStep>('select-asset')
  const [selectedChain, setSelectedChain] = useState<ChainKey>(DEFAULT_CHAIN)
  const [destinationAddress, setDestinationAddress] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const sessionStarting = useRef(false)
  const settlingStarted = useRef(false)

  // NFC card destination state
  const [nfcCardId, setNfcCardId] = useState('')
  const [nfcIsNewCard, setNfcIsNewCard] = useState(false)
  const [nfcPin, setNfcPin] = useState('')
  const [nfcPinConfirm, setNfcPinConfirm] = useState('')
  const [nfcPinStage, setNfcPinStage] = useState<'enter' | 'confirm'>('enter')
  const [nfcError, setNfcError] = useState('')
  const [nfcBalance, setNfcBalance] = useState('')
  const [nfcProcessing, setNfcProcessing] = useState(false)

  const { connected: nfcConnected } = useNfcEvents({
    enabled: step === 'nfc-tap',
    onCardTapped: async (uid) => {
      if (step !== 'nfc-tap') return
      setNfcCardId(uid)
      setNfcError('')
      try {
        // Check if card already exists
        const info = await apiGetCardInfo(uid)
        if (info.success && info.hasPin) {
          // Existing card with PIN — top up directly
          setNfcIsNewCard(false)
          setNfcProcessing(true)
          const topUpResult = await apiTopUpCard(uid, state.balanceUSDC.toFixed(6))
          if (topUpResult.success) {
            setNfcBalance(topUpResult.newBalance)
            setStep('nfc-done')
          } else {
            setNfcError(topUpResult.message || 'Top-up failed')
          }
          setNfcProcessing(false)
        } else {
          // New card or card without PIN — need PIN setup
          await apiCreateCardWithId(uid)
          setNfcIsNewCard(true)
          setStep('nfc-pin')
        }
      } catch {
        // Card doesn't exist — create it
        try {
          await apiCreateCardWithId(uid)
          setNfcIsNewCard(true)
          setStep('nfc-pin')
        } catch (err) {
          setNfcError(err instanceof Error ? err.message : 'Failed to create card')
        }
      }
    },
  })

  // ──────────────────────────────────────────────────────────────────────────
  // select-asset
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'select-asset') {
    return (
      <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
        {/* iOS-style header: Back | Title | Next */}
        <div className="flex items-center justify-between px-1">
          <a
            href="/app/kiosk"
            className="text-[11px] uppercase tracking-wider px-2 py-0.5 border"
            style={{ color: '#7a7a9a', borderColor: '#7a7a9a' }}
          >
            ‹ Back
          </a>
          <h1
            className="text-sm"
            style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
          >
            Buy Crypto
          </h1>
          <button
            onClick={() => setStep('processing')}
            className="text-[11px] uppercase tracking-wider px-2 py-0.5 border"
            style={{ color: '#ffd700', borderColor: '#ffd700' }}
          >
            Next ›
          </button>
        </div>

        <p className="text-[11px] uppercase tracking-widest text-center" style={{ color: '#7a7a9a' }}>
          Select asset to purchase
        </p>

        {/* Content */}
        <div className="flex-1 flex flex-col gap-3 justify-center">
          {SUPPORTED_ASSETS.map((asset) => (
            <button
              key={asset.id}
              className="w-full p-4 text-left transition-all duration-100 touch-active"
              style={{
                backgroundColor: '#0f0f24',
                border: '2px solid #667eea',
                boxShadow: '0 0 8px rgba(102, 126, 234, 0.2), inset -2px -2px 0px 0px rgba(0,0,0,0.2)',
              }}
            >
              <p
                className="text-sm uppercase tracking-wider"
                style={{ color: '#e0e8f0', textShadow: '0 0 6px rgba(102, 126, 234, 0.3)' }}
              >
                {asset.name}
              </p>
              <p className="text-[11px] uppercase tracking-wider mt-1" style={{ color: '#7a7a9a' }}>
                Stablecoin - $1.00 USD
              </p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // processing — start session BEFORE coins
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'processing') {
    const handleProcessingComplete = async () => {
      if (sessionStarting.current) return
      sessionStarting.current = true
      try {
        const result = await apiStartSession()
        dispatch(actions.setSessionId(result.sessionId))
        setStep('insert-coins')
      } catch {
        sessionStarting.current = false
        // stay on processing — user can retry
      }
    }

    return (
      <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
        {/* Title area */}
        <div className="text-center">
          <h1
            className="text-lg"
            style={{ color: '#667eea', textShadow: '0 0 10px rgba(102, 126, 234, 0.5)' }}
          >
            Processing
          </h1>
          <p className="text-[11px] uppercase tracking-widest mt-1" style={{ color: '#7a7a9a' }}>
            Starting session...
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="w-full max-w-xs">
            <ProgressBar progress={0} isAnimating onComplete={handleProcessingComplete} />
          </div>

          <p className="text-[11px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
            Connecting to kiosk...
          </p>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // insert-coins — session already exists at this point
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'insert-coins') {
    const handleCoinInserted = (pesos: number, usdc: number) => {
      dispatch(actions.insertCoin(pesos, usdc))
      // Fire-and-forget deposit to session (only if session exists)
      if (state.sessionId) {
        apiDepositToSession(state.sessionId, usdc.toFixed(6)).catch(() => {})
      }
    }

    return (
      <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
        {/* iOS-style header: Back | Title | Confirm */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => setStep('select-asset')}
            className="text-[11px] uppercase tracking-wider px-2 py-0.5 border"
            style={{ color: '#7a7a9a', borderColor: '#7a7a9a' }}
          >
            ‹ Back
          </button>
          <h1
            className="text-sm"
            style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
          >
            Insert Coins
          </h1>
          <button
            onClick={() => setStep('confirm-amount')}
            disabled={state.totalDepositedUSDC <= 0}
            className="text-[11px] uppercase tracking-wider px-2 py-0.5 border"
            style={{ color: state.totalDepositedUSDC > 0 ? '#ffd700' : '#3a3a5a', borderColor: state.totalDepositedUSDC > 0 ? '#ffd700' : '#3a3a5a' }}
          >
            Next ›
          </button>
        </div>

        <p className="text-[11px] uppercase tracking-widest text-center" style={{ color: '#7a7a9a' }}>
          {getModeFeatures().useSimulatedCoins ? 'Tap a coin to simulate insertion' : 'Insert coins into the slot'}
        </p>

        {/* Content */}
        <div className="flex-1 min-h-0">
          <CoinSlotSimulator
            onCoinInserted={handleCoinInserted}
            totalPesos={state.totalDepositedPesos}
            totalUSDC={state.totalDepositedUSDC}
          />
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // confirm-amount
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'confirm-amount') {
    const fee = calculateFee(state.balanceUSDC)

    return (
      <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
        {/* iOS-style header: Add More | Title | Confirm */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => setStep('insert-coins')}
            className="text-[11px] uppercase tracking-wider px-2 py-0.5 border"
            style={{ color: '#7a7a9a', borderColor: '#7a7a9a' }}
          >
            ‹ Add More
          </button>
          <h1
            className="text-sm"
            style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
          >
            Confirm
          </h1>
          <button
            onClick={() => setStep('choose-destination')}
            className="text-[11px] uppercase tracking-wider px-2 py-0.5 border"
            style={{ color: '#ffd700', borderColor: '#ffd700' }}
          >
            Next ›
          </button>
        </div>

        <p className="text-[11px] uppercase tracking-widest text-center" style={{ color: '#7a7a9a' }}>
          Review fee breakdown
        </p>

        {/* Content — fee table */}
        <div className="flex-1 flex flex-col gap-3 justify-center">
          {/* Gross */}
          <div
            className="flex items-center justify-between p-3 border-2"
            style={{
              backgroundColor: '#0f0f24',
              borderColor: '#2a2a4a',
              boxShadow: 'inset -2px -2px 0px 0px rgba(0,0,0,0.2)',
            }}
          >
            <span className="text-[13px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
              Gross Amount
            </span>
            <span className="text-sm" style={{ color: '#e0e8f0' }}>
              ${fee.grossAmount.toFixed(6)} USDC
            </span>
          </div>

          {/* Fee */}
          <div
            className="flex items-center justify-between p-3 border-2"
            style={{
              backgroundColor: '#0f0f24',
              borderColor: '#2a2a4a',
              boxShadow: 'inset -2px -2px 0px 0px rgba(0,0,0,0.2)',
            }}
          >
            <span className="text-[13px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
              Fee ({fee.feePercentage})
            </span>
            <span className="text-sm" style={{ color: '#f093fb' }}>
              -${fee.fee.toFixed(6)}
            </span>
          </div>

          {/* Net */}
          <div
            className="flex items-center justify-between p-3 border-2"
            style={{
              backgroundColor: '#0f0f24',
              borderColor: '#78ffd6',
              boxShadow: '0 0 8px rgba(120, 255, 214, 0.15), inset -2px -2px 0px 0px rgba(0,0,0,0.2)',
            }}
          >
            <span className="text-[13px] uppercase tracking-wider" style={{ color: '#78ffd6' }}>
              Net Amount
            </span>
            <span
              className="text-sm"
              style={{ color: '#78ffd6', textShadow: '0 0 8px rgba(120, 255, 214, 0.4)' }}
            >
              ${fee.netAmount.toFixed(6)} USDC
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
    const handlePrintPin = async () => {
      setIsProcessing(true)
      try {
        const result = await apiSessionToPin(
          state.sessionId ?? ''
        )
        dispatch(actions.setPinData({
          pin: result.pin,
          walletId: result.walletId,
          amount: result.amount,
        }))
        setStep('pin-generated')
      } catch {
        // stay here
      } finally {
        setIsProcessing(false)
      }
    }

    return (
      <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
        {/* iOS-style header: Back | Title | spacer */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => setStep('confirm-amount')}
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

        {/* Content — four buttons */}
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

          <ArcadeButton
            size="lg"
            variant="secondary"
            onClick={() => {
              setNfcCardId('')
              setNfcIsNewCard(false)
              setNfcPin('')
              setNfcPinConfirm('')
              setNfcPinStage('enter')
              setNfcError('')
              setNfcBalance('')
              setStep('nfc-tap')
            }}
            className="w-full"
          >
            Save to NFC Card
          </ArcadeButton>

          <ArcadeButton
            size="lg"
            variant="accent"
            onClick={handlePrintPin}
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? 'Generating...' : 'Print PIN & Wallet'}
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
        {/* Title area */}
        <div className="text-center">
          <h1
            className="text-lg"
            style={{ color: '#78ffd6', textShadow: '0 0 10px rgba(120, 255, 214, 0.5)' }}
          >
            Scan QR
          </h1>
          <p className="text-[11px] uppercase tracking-widest mt-1" style={{ color: '#7a7a9a' }}>
            Point camera at wallet QR code
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
            onClick={() => {
              dispatch(actions.setDestination(destinationAddress, selectedChain, 'qr'))
              setStep('settling')
            }}
            className="text-[11px] uppercase tracking-wider px-2 py-0.5 border"
            style={{ color: '#ffd700', borderColor: '#ffd700' }}
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
          <ChainSelector
            selectedChain={selectedChain}
            onSelect={setSelectedChain}
          />
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // settling
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'settling') {
    const handleSettleComplete = async () => {
      if (settlingStarted.current) return
      settlingStarted.current = true
      try {
        const result = await apiEndSession(
          state.sessionId ?? '',
          destinationAddress,
          selectedChain
        )
        dispatch(actions.setSettlementResult({
          success: result.success,
          settledAmount: result.settledAmount,
          fee: result.fee,
          bridgeTxHash: result.bridgeTxHash,
          explorerUrl: result.explorerUrl,
          destinationChain: result.destinationChain,
          message: result.message,
        }))
        setStep('done')
      } catch {
        settlingStarted.current = false
      }
    }

    return (
      <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
        {/* Title area */}
        <div className="text-center">
          <h1
            className="text-lg"
            style={{ color: '#667eea', textShadow: '0 0 10px rgba(102, 126, 234, 0.5)' }}
          >
            Settling
          </h1>
          <p className="text-[11px] uppercase tracking-widest mt-1" style={{ color: '#7a7a9a' }}>
            Sending to {SUPPORTED_CHAINS[selectedChain].name}...
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="w-full max-w-xs">
            <ProgressBar progress={0} isAnimating onComplete={handleSettleComplete} />
          </div>

          <p className="text-[11px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
            Bridging ${state.balanceUSDC.toFixed(2)} USDC...
          </p>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // done
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'done') {
    const result = state.settlementResult
    const truncateAddr = (addr: string) =>
      addr.length > 16 ? addr.slice(0, 8) + '...' + addr.slice(-6) : addr
    const truncateHash = (hash: string) =>
      hash.length > 16 ? hash.slice(0, 10) + '...' + hash.slice(-6) : hash

    return (
      <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
        {/* iOS-style header */}
        <div className="flex items-center justify-between px-1">
          <span className="w-12" />
          <h1
            className="text-sm"
            style={{ color: '#78ffd6', textShadow: '0 0 10px rgba(120, 255, 214, 0.5)' }}
          >
            Complete
          </h1>
          <button
            onClick={() => {
              dispatch(actions.reset())
              router.push('/app/kiosk')
            }}
            className="text-[11px] uppercase tracking-wider px-2 py-0.5 border"
            style={{ color: '#ffd700', borderColor: '#ffd700' }}
          >
            Done ›
          </button>
        </div>

        {/* Receipt — two-column layout */}
        <div className="flex-1 flex gap-3 min-h-0">
          {/* Left: receipt details */}
          <div className="flex-1 flex flex-col gap-1.5">
            {[
              { label: 'Sent', value: `$${result?.settledAmount ?? '0'} USDC`, color: '#78ffd6' },
              { label: 'Fee', value: `$${result?.fee.fee.toFixed(6) ?? '0'}`, color: '#f093fb' },
              { label: 'To', value: truncateAddr(destinationAddress), color: '#667eea' },
              { label: 'Chain', value: SUPPORTED_CHAINS[selectedChain].name, color: '#e0e8f0' },
              ...(result?.bridgeTxHash ? [{ label: 'TX', value: truncateHash(result.bridgeTxHash), color: '#ffd700' }] : []),
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
          {result?.explorerUrl && (
            <div
              className="flex flex-col items-center justify-center gap-1 px-3 border"
              style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}
            >
              <span className="text-[10px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
                Verify
              </span>
              <div className="bg-white p-1.5">
                <QRCodeSVG value={result.explorerUrl} size={80} />
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // pin-generated
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'pin-generated' && state.pinData) {
    return (
      <div className="h-full flex flex-col p-2 overflow-hidden">
        <PinDisplay
          pin={state.pinData.pin}
          walletId={state.pinData.walletId}
          amount={state.pinData.amount}
          onDone={() => {
            dispatch(actions.reset())
            router.push('/app/kiosk')
          }}
        />
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // nfc-tap — waiting for NFC card
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'nfc-tap') {
    return (
      <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
        {/* iOS-style header: Back | Title | spacer */}
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
            style={{ color: '#667eea', textShadow: '0 0 10px rgba(102, 126, 234, 0.5)' }}
          >
            Tap NFC Card
          </h1>
          <span className="w-12" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <NFCIndicator status={nfcProcessing ? 'ready' : 'scanning'} />

          <div className="text-center space-y-1">
            <p className="text-sm uppercase tracking-wider" style={{ color: '#667eea' }}>
              {nfcProcessing ? 'Processing...' : nfcConnected ? 'Ready — tap your card' : 'Waiting for NFC...'}
            </p>
            <p className="text-[11px]" style={{ color: '#78ffd6' }}>
              Any NFC chip works — metro card, wristband, sticker, badge
            </p>
            <p className="text-[10px]" style={{ color: '#7a7a9a' }}>
              Your card becomes a crypto wallet instantly
            </p>
          </div>

          {nfcError && (
            <p className="text-[13px] text-center px-4" style={{ color: '#ef4444' }}>
              {nfcError}
            </p>
          )}

          <div
            className="p-2 border-2 text-center"
            style={{
              backgroundColor: '#0f0f24',
              borderColor: '#78ffd6',
              boxShadow: '0 0 8px rgba(120, 255, 214, 0.15)',
            }}
          >
            <span className="text-[13px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
              Amount to save:{' '}
            </span>
            <span
              className="text-sm"
              style={{ color: '#78ffd6', textShadow: '0 0 8px rgba(120, 255, 214, 0.4)' }}
            >
              ${state.balanceUSDC.toFixed(6)} USDC
            </span>
          </div>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // nfc-pin — set PIN for new NFC card
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'nfc-pin') {
    const inConfirm = nfcPinStage === 'confirm'

    const handleSave = async () => {
      if (nfcPin !== nfcPinConfirm) {
        setNfcError('PINs do not match — try again')
        setNfcPinConfirm('')
        setNfcPinStage('confirm') // stay in confirm, clear input
        return
      }

      setNfcProcessing(true)
      setNfcError('')
      try {
        const pinResult = await apiSetCardPin(nfcCardId, nfcPin)
        if (!pinResult.success) {
          setNfcError(pinResult.message || 'Failed to set PIN')
          setNfcProcessing(false)
          return
        }
        const topUpResult = await apiTopUpCard(nfcCardId, state.balanceUSDC.toFixed(6))
        if (topUpResult.success) {
          setNfcBalance(topUpResult.newBalance)
          setStep('nfc-done')
        } else {
          setNfcError(topUpResult.message || 'Top-up failed')
        }
      } catch (err) {
        setNfcError(err instanceof Error ? err.message : 'Failed to save')
      } finally {
        setNfcProcessing(false)
      }
    }

    return (
      <div className="h-full flex flex-col p-2 gap-1 overflow-hidden">
        {/* iOS-style header: Back | Title | Next/Save */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => {
              if (inConfirm) { setNfcPinConfirm(''); setNfcPinStage('enter') }
              else { setStep('choose-destination') }
            }}
            className="text-[11px] uppercase tracking-wider px-2 py-0.5 border"
            style={{ color: '#7a7a9a', borderColor: '#7a7a9a' }}
          >
            ‹ Back
          </button>
          <h1
            className="text-sm"
            style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
          >
            {inConfirm ? 'Confirm PIN' : 'Set PIN'}
          </h1>
          {!inConfirm ? (
            <button
              onClick={() => { setNfcPinConfirm(''); setNfcError(''); setNfcPinStage('confirm') }}
              disabled={nfcPin.length < 4}
              className="text-[11px] uppercase tracking-wider px-2 py-0.5 border"
              style={{ color: nfcPin.length >= 4 ? '#ffd700' : '#3a3a5a', borderColor: nfcPin.length >= 4 ? '#ffd700' : '#3a3a5a' }}
            >
              Next ›
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={nfcProcessing || nfcPinConfirm.length < 4}
              className="text-[11px] uppercase tracking-wider px-2 py-0.5 border"
              style={{ color: !nfcProcessing && nfcPinConfirm.length >= 4 ? '#ffd700' : '#3a3a5a', borderColor: !nfcProcessing && nfcPinConfirm.length >= 4 ? '#ffd700' : '#3a3a5a' }}
            >
              {nfcProcessing ? 'Wait...' : 'Save ›'}
            </button>
          )}
        </div>

        <div className="flex-1 flex flex-col gap-1 min-h-0">
          {/* Card ID */}
          <div
            className="p-1 border-2 text-center"
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
              {nfcCardId.length > 12 ? nfcCardId.slice(0, 6) + '...' + nfcCardId.slice(-4) : nfcCardId}
            </span>
            <span className="text-[11px] ml-2" style={{ color: '#78ffd6' }}>
              (card removed OK)
            </span>
          </div>

          <NumericKeypad
            value={inConfirm ? nfcPinConfirm : nfcPin}
            onChange={inConfirm ? setNfcPinConfirm : setNfcPin}
            maxLength={6}
            isPin
          />

          {nfcError && (
            <p className="text-[13px] text-center" style={{ color: '#ef4444' }}>
              {nfcError}
            </p>
          )}
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // nfc-done — balance saved to NFC card
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'nfc-done') {
    return (
      <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
        {/* iOS-style header */}
        <div className="flex items-center justify-between px-1">
          <span className="w-12" />
          <h1
            className="text-sm"
            style={{ color: '#78ffd6', textShadow: '0 0 10px rgba(120, 255, 214, 0.5)' }}
          >
            {nfcIsNewCard ? 'Card Created' : 'Added'}
          </h1>
          <button
            onClick={() => {
              dispatch(actions.reset())
              router.push('/app/kiosk')
            }}
            className="text-[11px] uppercase tracking-wider px-2 py-0.5 border"
            style={{ color: '#ffd700', borderColor: '#ffd700' }}
          >
            Done ›
          </button>
        </div>
        {nfcIsNewCard && (
          <p className="text-[11px] uppercase tracking-widest text-center" style={{ color: '#ffd700' }}>
            Take a photo of this screen!
          </p>
        )}

        <div className="flex-1 flex flex-col gap-1.5 min-h-0">
          {/* Card ID */}
          <div
            className="flex items-center justify-between px-3 py-1.5 border"
            style={{ backgroundColor: '#0f0f24', borderColor: '#667eea' }}
          >
            <span className="text-[11px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>Card</span>
            <span className="text-sm font-mono" style={{ color: '#667eea' }}>
              {nfcCardId.length > 12 ? nfcCardId.slice(0, 6) + '...' + nfcCardId.slice(-4) : nfcCardId}
            </span>
          </div>

          {/* PIN — only show for new cards */}
          {nfcIsNewCard && nfcPin && (
            <div
              className="flex items-center justify-between px-3 py-1.5 border"
              style={{ backgroundColor: '#0f0f24', borderColor: '#ffd700' }}
            >
              <span className="text-[11px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>PIN</span>
              <span
                className="text-sm font-mono tracking-[0.3em]"
                style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.4)' }}
              >
                {nfcPin}
              </span>
            </div>
          )}

          {/* Balance */}
          <div
            className="flex items-center justify-between px-3 py-1.5 border"
            style={{ backgroundColor: '#0f0f24', borderColor: '#78ffd6' }}
          >
            <span className="text-[11px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>Balance</span>
            <span
              className="text-sm"
              style={{ color: '#78ffd6', textShadow: '0 0 8px rgba(120, 255, 214, 0.4)' }}
            >
              ${nfcBalance} USDC
            </span>
          </div>

          {/* Compact info */}
          <div
            className="px-3 py-2 border space-y-1"
            style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}
          >
            <p className="text-[11px]" style={{ color: '#f093fb' }}>
              Your NFC card is now a crypto wallet!
            </p>
            <p className="text-[10px]" style={{ color: '#7a7a9a' }}>
              Tap at any Ki0xk kiosk to check balance, top up, or withdraw USDC.
            </p>
            {nfcIsNewCard && (
              <p className="text-[10px]" style={{ color: '#ffd700' }}>
                Remember your PIN — you need it to spend or withdraw.
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Fallback — should never be reached
  return null
}
