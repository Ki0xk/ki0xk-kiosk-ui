'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useKi0xk, actions } from '@/lib/state'
import { SUPPORTED_ASSETS, SUPPORTED_CHAINS, calculateFee, type ChainKey, DEFAULT_CHAIN } from '@/lib/constants'
import { mockStartSession, mockDepositToSession, mockEndSession, mockSessionToPin } from '@/lib/mock'
import { ArcadeButton } from '@/components/ki0xk/ArcadeButton'
import { CoinSlotSimulator } from '@/components/ki0xk/CoinSlotSimulator'
import { QrScanner } from '@/components/ki0xk/QrScanner'
import { OnScreenKeyboard } from '@/components/ki0xk/OnScreenKeyboard'
import { ChainSelector } from '@/components/ki0xk/ChainSelector'
import { PinDisplay } from '@/components/ki0xk/PinDisplay'
import { ProgressBar } from '@/components/ki0xk/ProgressBar'
import { CoinAnimation } from '@/components/ki0xk/CoinAnimation'

type BuyStep =
  | 'select-asset'
  | 'insert-coins'
  | 'confirm-amount'
  | 'processing'
  | 'balance-confirmed'
  | 'choose-destination'
  | 'qr-scan'
  | 'ens-input'
  | 'select-chain'
  | 'settling'
  | 'done'
  | 'pin-generated'

export default function BuyPage() {
  const router = useRouter()
  const { state, dispatch } = useKi0xk()

  const [step, setStep] = useState<BuyStep>('select-asset')
  const [selectedChain, setSelectedChain] = useState<ChainKey>(DEFAULT_CHAIN)
  const [destinationAddress, setDestinationAddress] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // ──────────────────────────────────────────────────────────────────────────
  // select-asset
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'select-asset') {
    return (
      <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
        {/* Title area */}
        <div className="text-center">
          <h1
            className="text-lg"
            style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
          >
            Buy Crypto
          </h1>
          <p className="text-[8px] uppercase tracking-widest mt-1" style={{ color: '#7a7a9a' }}>
            Select asset to purchase
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col gap-3">
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
              <p className="text-[8px] uppercase tracking-wider mt-1" style={{ color: '#7a7a9a' }}>
                Stablecoin - $1.00 USD
              </p>
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <ArcadeButton
            size="md"
            variant="primary"
            onClick={() => setStep('insert-coins')}
            className="w-full"
          >
            Next
          </ArcadeButton>

          <a href="/app/kiosk" className="text-center">
            <span className="text-[8px] uppercase tracking-wider transition-colors" style={{ color: '#7a7a9a' }}>
              Back
            </span>
          </a>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // insert-coins
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'insert-coins') {
    const handleCoinInserted = (pesos: number, usdc: number) => {
      dispatch(actions.insertCoin(pesos, usdc))
      // Fire-and-forget deposit to session
      mockDepositToSession(
        state.sessionId ?? 'pending',
        usdc.toFixed(6)
      ).catch(() => {})
    }

    return (
      <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
        {/* Title area */}
        <div className="text-center">
          <h1
            className="text-lg"
            style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
          >
            Insert Coins
          </h1>
          <p className="text-[8px] uppercase tracking-widest mt-1" style={{ color: '#7a7a9a' }}>
            Tap a coin to simulate insertion
          </p>
        </div>

        {/* Content */}
        <div className="flex-1">
          <CoinSlotSimulator
            onCoinInserted={handleCoinInserted}
            totalPesos={state.totalDepositedPesos}
            totalUSDC={state.totalDepositedUSDC}
          />
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <ArcadeButton
            size="md"
            variant="primary"
            onClick={() => setStep('confirm-amount')}
            disabled={state.totalDepositedUSDC <= 0}
            className="w-full"
          >
            Confirm
          </ArcadeButton>

          <button
            onClick={() => setStep('select-asset')}
            className="w-full text-[8px] uppercase tracking-wider py-2 transition-colors"
            style={{ color: '#7a7a9a' }}
          >
            Back
          </button>
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
      <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
        {/* Title area */}
        <div className="text-center">
          <h1
            className="text-lg"
            style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
          >
            Confirm Amount
          </h1>
          <p className="text-[8px] uppercase tracking-widest mt-1" style={{ color: '#7a7a9a' }}>
            Review fee breakdown
          </p>
        </div>

        {/* Content — fee table */}
        <div className="flex-1 flex flex-col gap-3">
          {/* Gross */}
          <div
            className="flex items-center justify-between p-3 border-2"
            style={{
              backgroundColor: '#0f0f24',
              borderColor: '#2a2a4a',
              boxShadow: 'inset -2px -2px 0px 0px rgba(0,0,0,0.2)',
            }}
          >
            <span className="text-[9px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
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
            <span className="text-[9px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
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
            <span className="text-[9px] uppercase tracking-wider" style={{ color: '#78ffd6' }}>
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

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <ArcadeButton
            size="md"
            variant="primary"
            onClick={() => setStep('processing')}
            className="w-full"
          >
            Confirm
          </ArcadeButton>

          <ArcadeButton
            size="sm"
            variant="secondary"
            onClick={() => setStep('insert-coins')}
            className="w-full"
          >
            Add More
          </ArcadeButton>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // processing
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'processing') {
    const handleProcessingComplete = async () => {
      try {
        const result = await mockStartSession()
        dispatch(actions.setSessionId(result.sessionId))
        setStep('balance-confirmed')
      } catch {
        // stay on processing — user can retry
      }
    }

    return (
      <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
        {/* Title area */}
        <div className="text-center">
          <h1
            className="text-lg"
            style={{ color: '#667eea', textShadow: '0 0 10px rgba(102, 126, 234, 0.5)' }}
          >
            Processing
          </h1>
          <p className="text-[8px] uppercase tracking-widest mt-1" style={{ color: '#7a7a9a' }}>
            Starting session...
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="w-full max-w-xs">
            <ProgressBar progress={0} isAnimating onComplete={handleProcessingComplete} />
          </div>

          <p className="text-[8px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
            Opening ClearNode channel...
          </p>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // balance-confirmed
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'balance-confirmed') {
    return (
      <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
        {/* Title area */}
        <div className="text-center">
          <h1
            className="text-lg"
            style={{ color: '#78ffd6', textShadow: '0 0 10px rgba(120, 255, 214, 0.5)' }}
          >
            Balance Confirmed
          </h1>
          <p className="text-[8px] uppercase tracking-widest mt-1" style={{ color: '#7a7a9a' }}>
            Funds ready to send
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          {/* Checkmark icon */}
          <div
            className="w-20 h-20 flex items-center justify-center"
            style={{
              border: '4px solid #78ffd6',
              boxShadow: '0 0 12px rgba(120, 255, 214, 0.4), 0 0 24px rgba(120, 255, 214, 0.15)',
            }}
          >
            <span className="text-3xl" style={{ color: '#78ffd6' }}>{'\u2713'}</span>
          </div>

          {/* Amount */}
          <p
            className="text-2xl"
            style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
          >
            ${state.balanceUSDC.toFixed(2)} USDC
          </p>

          {/* Session ID */}
          <div
            className="px-4 py-2 border-2"
            style={{
              backgroundColor: '#0f0f24',
              borderColor: '#2a2a4a',
              boxShadow: 'inset -2px -2px 0px 0px rgba(0,0,0,0.2)',
            }}
          >
            <span className="text-[8px] uppercase tracking-widest" style={{ color: '#7a7a9a' }}>
              Session:{' '}
            </span>
            <span className="text-[9px] font-mono" style={{ color: '#667eea' }}>
              {state.sessionId}
            </span>
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
            Choose Destination
          </ArcadeButton>
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
        const result = await mockSessionToPin(
          state.sessionId ?? '',
          state.balanceUSDC.toFixed(6)
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
      <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
        {/* Title area */}
        <div className="text-center">
          <h1
            className="text-lg"
            style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
          >
            Where To Send?
          </h1>
          <p className="text-[8px] uppercase tracking-widest mt-1" style={{ color: '#7a7a9a' }}>
            Choose destination method
          </p>
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

          <div className="relative">
            <ArcadeButton
              size="lg"
              variant="secondary"
              disabled
              className="w-full"
            >
              Tap NFC
            </ArcadeButton>
            <span
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[7px] uppercase tracking-widest"
              style={{ color: '#7a7a9a' }}
            >
              Coming Soon
            </span>
          </div>

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
      <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
        {/* Title area */}
        <div className="text-center">
          <h1
            className="text-lg"
            style={{ color: '#78ffd6', textShadow: '0 0 10px rgba(120, 255, 214, 0.5)' }}
          >
            Scan QR
          </h1>
          <p className="text-[8px] uppercase tracking-widest mt-1" style={{ color: '#7a7a9a' }}>
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
      <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
        {/* Title area */}
        <div className="text-center">
          <h1
            className="text-lg"
            style={{ color: '#667eea', textShadow: '0 0 10px rgba(102, 126, 234, 0.5)' }}
          >
            Enter Address
          </h1>
          <p className="text-[8px] uppercase tracking-widest mt-1" style={{ color: '#7a7a9a' }}>
            Type wallet address or ENS name
          </p>
        </div>

        {/* Content */}
        <div className="flex-1">
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

        {/* Back */}
        <button
          onClick={() => {
            setDestinationAddress('')
            setStep('choose-destination')
          }}
          className="w-full text-[8px] uppercase tracking-wider py-2 transition-colors"
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
      <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
        {/* Title area */}
        <div className="text-center">
          <h1
            className="text-lg"
            style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
          >
            Select Chain
          </h1>
          <p className="text-[8px] uppercase tracking-widest mt-1" style={{ color: '#7a7a9a' }}>
            Choose destination network
          </p>
        </div>

        {/* Destination preview */}
        <div
          className="p-3 border-2 text-center"
          style={{
            backgroundColor: '#0f0f24',
            borderColor: '#2a2a4a',
            boxShadow: 'inset -2px -2px 0px 0px rgba(0,0,0,0.2)',
          }}
        >
          <span className="text-[8px] uppercase tracking-widest" style={{ color: '#7a7a9a' }}>
            Sending to:{' '}
          </span>
          <span className="text-[9px] font-mono" style={{ color: '#78ffd6' }}>
            {destinationAddress.length > 20
              ? destinationAddress.slice(0, 10) + '...' + destinationAddress.slice(-8)
              : destinationAddress}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <ChainSelector
            selectedChain={selectedChain}
            onSelect={setSelectedChain}
          />
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <ArcadeButton
            size="md"
            variant="primary"
            onClick={() => {
              dispatch(actions.setDestination(destinationAddress, selectedChain, 'qr'))
              setStep('settling')
            }}
            className="w-full"
          >
            Confirm & Send
          </ArcadeButton>

          <button
            onClick={() => setStep('choose-destination')}
            className="w-full text-[8px] uppercase tracking-wider py-2 transition-colors"
            style={{ color: '#7a7a9a' }}
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // settling
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'settling') {
    const handleSettleComplete = async () => {
      try {
        const result = await mockEndSession(
          state.sessionId ?? '',
          destinationAddress,
          selectedChain,
          state.balanceUSDC
        )
        dispatch(actions.setSettlementResult({
          success: result.success,
          settledAmount: result.settledAmount,
          fee: result.fee,
          bridgeTxHash: result.bridgeTxHash,
          destinationChain: result.destinationChain,
          message: result.message,
        }))
        setStep('done')
      } catch {
        // stay on settling
      }
    }

    return (
      <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
        {/* Title area */}
        <div className="text-center">
          <h1
            className="text-lg"
            style={{ color: '#667eea', textShadow: '0 0 10px rgba(102, 126, 234, 0.5)' }}
          >
            Settling
          </h1>
          <p className="text-[8px] uppercase tracking-widest mt-1" style={{ color: '#7a7a9a' }}>
            Sending to {SUPPORTED_CHAINS[selectedChain].name}...
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="w-full max-w-xs">
            <ProgressBar progress={0} isAnimating onComplete={handleSettleComplete} />
          </div>

          <p className="text-[8px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
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
      <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
        {/* Title area */}
        <div className="text-center">
          <h1
            className="text-lg"
            style={{ color: '#78ffd6', textShadow: '0 0 10px rgba(120, 255, 214, 0.5)' }}
          >
            Transaction Complete
          </h1>
          <div
            className="w-24 h-1 mx-auto mt-2"
            style={{
              background: 'linear-gradient(90deg, #78ffd6, #667eea, #764ba2, #f093fb, #ffd700)',
            }}
          />
        </div>

        {/* Content — receipt */}
        <div className="flex-1 flex flex-col gap-3">
          {/* Amount sent */}
          <div
            className="flex items-center justify-between p-3 border-2"
            style={{
              backgroundColor: '#0f0f24',
              borderColor: '#2a2a4a',
              boxShadow: 'inset -2px -2px 0px 0px rgba(0,0,0,0.2)',
            }}
          >
            <span className="text-[9px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
              Amount Sent
            </span>
            <span
              className="text-sm"
              style={{ color: '#78ffd6', textShadow: '0 0 8px rgba(120, 255, 214, 0.4)' }}
            >
              ${result?.settledAmount ?? '0'} USDC
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
            <span className="text-[9px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
              Fee
            </span>
            <span className="text-sm" style={{ color: '#f093fb' }}>
              ${result?.fee.fee.toFixed(6) ?? '0'}
            </span>
          </div>

          {/* Destination */}
          <div
            className="flex items-center justify-between p-3 border-2"
            style={{
              backgroundColor: '#0f0f24',
              borderColor: '#2a2a4a',
              boxShadow: 'inset -2px -2px 0px 0px rgba(0,0,0,0.2)',
            }}
          >
            <span className="text-[9px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
              Destination
            </span>
            <span className="text-[9px] font-mono" style={{ color: '#667eea' }}>
              {truncateAddr(destinationAddress)}
            </span>
          </div>

          {/* Chain */}
          <div
            className="flex items-center justify-between p-3 border-2"
            style={{
              backgroundColor: '#0f0f24',
              borderColor: '#2a2a4a',
              boxShadow: 'inset -2px -2px 0px 0px rgba(0,0,0,0.2)',
            }}
          >
            <span className="text-[9px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
              Chain
            </span>
            <span className="text-[9px] uppercase tracking-wider" style={{ color: '#e0e8f0' }}>
              {SUPPORTED_CHAINS[selectedChain].name}
            </span>
          </div>

          {/* TX Hash */}
          {result?.bridgeTxHash && (
            <div
              className="flex items-center justify-between p-3 border-2"
              style={{
                backgroundColor: '#0f0f24',
                borderColor: '#2a2a4a',
                boxShadow: 'inset -2px -2px 0px 0px rgba(0,0,0,0.2)',
              }}
            >
              <span className="text-[9px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
                TX Hash
              </span>
              <span className="text-[8px] font-mono" style={{ color: '#ffd700' }}>
                {truncateHash(result.bridgeTxHash)}
              </span>
            </div>
          )}
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
            New Transaction
          </ArcadeButton>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // pin-generated
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'pin-generated' && state.pinData) {
    return (
      <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
        {/* Title area */}
        <div className="text-center">
          <h1
            className="text-lg"
            style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
          >
            PIN Generated
          </h1>
          <p className="text-[8px] uppercase tracking-widest mt-1" style={{ color: '#7a7a9a' }}>
            Save or print this receipt
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center">
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
      </div>
    )
  }

  // Fallback — should never be reached
  return null
}
