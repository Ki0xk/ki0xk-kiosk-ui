'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { ArcadeButton } from '@/components/ki0xk/ArcadeButton'
import { NFCIndicator } from '@/components/ki0xk/NFCIndicator'
import { ProgressBar } from '@/components/ki0xk/ProgressBar'
import { NumericKeypad } from '@/components/ki0xk/NumericKeypad'
import { CoinAnimation } from '@/components/ki0xk/CoinAnimation'
import { CoinSlotSimulator } from '@/components/ki0xk/CoinSlotSimulator'
import { useNfcEvents } from '@/hooks/use-nfc-events'
import { useCoinEvents } from '@/hooks/use-coin-events'
import { MERCHANT_PRODUCTS, DEMO_PIN, WALLET_ID_CHARS, WALLET_ID_LENGTH, ONLINE_MAX_USDC, type Product } from '@/lib/constants'
import { getMode, getModeFeatures } from '@/lib/mode'
import { QRCodeSVG } from 'qrcode.react'
import {
  apiGetCardBalance,
  apiGetMerchants,
  apiFestivalPay,
  apiTopUpCard,
  apiCreateCardWithId,
  apiSetCardPin,
  apiGetCardInfo,
} from '@/lib/api-client'

type Flow = 'idle' | 'payment' | 'topup' | 'balance'

// Payment flow steps
type PayStep =
  | 'select-merchant'
  | 'build-cart'
  | 'tap-card'
  | 'enter-pin'
  | 'confirm'
  | 'processing'
  | 'success'
  | 'error'

// Top-up flow steps
type TopUpStep =
  | 'insert-coins'
  | 'tap-card'
  | 'processing'
  | 'success'
  | 'error'

interface CartItem {
  productId: string
  name: string
  price: string
  qty: number
}

interface MerchantInfo {
  id: string
  name: string
  walletAddress: string
  preferredChain: string
}

function generateWalletId(): string {
  let id = ''
  for (let i = 0; i < WALLET_ID_LENGTH; i++) {
    id += WALLET_ID_CHARS[Math.floor(Math.random() * WALLET_ID_CHARS.length)]
  }
  return id
}

export default function FestivalPublicPage() {
  const isOnlineDemo = getMode() === 'demo_online'

  const [flow, setFlow] = useState<Flow>('idle')

  // Online demo: wallet ID input for payment tap-card
  const [manualWalletId, setManualWalletId] = useState('')

  // Online demo: simulated coin total for top-up
  const [simTopUpPesos, setSimTopUpPesos] = useState(0)
  const [simTopUpUsdc, setSimTopUpUsdc] = useState(0)

  // Online demo: created wallet info for top-up tap-card
  const [createdWalletId, setCreatedWalletId] = useState('')
  const [topUpCreating, setTopUpCreating] = useState(false)

  // Online demo: balance check via wallet ID
  const [balanceWalletInput, setBalanceWalletInput] = useState('')

  // Payment state
  const [payStep, setPayStep] = useState<PayStep>('select-merchant')
  const [merchants, setMerchants] = useState<MerchantInfo[]>([])
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantInfo | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [walletId, setWalletId] = useState('')
  const [cardBalance, setCardBalance] = useState('')
  const [pin, setPin] = useState('')
  const [payResult, setPayResult] = useState<{
    txHash?: string
    explorerUrl?: string
    newBalance?: string
  } | null>(null)
  const [payError, setPayError] = useState('')

  // Top-up state
  const [topUpStep, setTopUpStep] = useState<TopUpStep>('insert-coins')
  const [coinTotal, setCoinTotal] = useState(0)
  const [topUpWalletId, setTopUpWalletId] = useState('')
  const [topUpNewBalance, setTopUpNewBalance] = useState('')
  const [topUpError, setTopUpError] = useState('')
  const [showCoinAnim, setShowCoinAnim] = useState(false)

  // Balance check state
  const [balanceChecking, setBalanceChecking] = useState(true)
  const [checkedBalance, setCheckedBalance] = useState<{
    walletId: string; balance: string; totalLoaded: string; totalSpent: string
  } | null>(null)
  const [balanceError, setBalanceError] = useState('')

  const cartTotal = cart.reduce((sum, item) => sum + parseFloat(item.price) * item.qty, 0)

  // NFC tap for payment
  const handlePayNfcTap = useCallback(async (uid: string, data?: { walletId: string }) => {
    if (flow !== 'payment' || payStep !== 'tap-card') return
    if (!data?.walletId) {
      setPayError('Card has no data — use Admin to set up')
      setPayStep('error')
      return
    }

    setWalletId(data.walletId)
    try {
      const bal = await apiGetCardBalance(data.walletId)
      setCardBalance(bal.balance)
      if (parseFloat(bal.balance) < cartTotal) {
        setPayError(`Insufficient balance: $${bal.balance} < $${cartTotal.toFixed(2)}`)
        setPayStep('error')
        return
      }
      setPayStep('enter-pin')
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Card error')
      setPayStep('error')
    }
  }, [flow, payStep, cartTotal])

  // NFC tap for top-up
  const handleTopUpNfcTap = useCallback(async (uid: string, data?: { walletId: string }) => {
    if (flow !== 'topup' || topUpStep !== 'tap-card') return
    if (!data?.walletId) {
      setTopUpError('Card has no data — use Admin to set up')
      setTopUpStep('error')
      return
    }

    setTopUpWalletId(data.walletId)
    setTopUpStep('processing')
    try {
      const result = await apiTopUpCard(data.walletId, coinTotal.toFixed(2))
      if (result.success) {
        setTopUpNewBalance(result.newBalance)
        setTopUpStep('success')
      } else {
        setTopUpError(result.message)
        setTopUpStep('error')
      }
    } catch (err) {
      setTopUpError(err instanceof Error ? err.message : 'Top-up failed')
      setTopUpStep('error')
    }
  }, [flow, topUpStep, coinTotal])

  // Balance check NFC handler
  const handleBalanceNfcTap = useCallback(async (uid: string, data?: { walletId: string }) => {
    if (flow !== 'balance' || !balanceChecking) return
    const walletId = data?.walletId || uid
    if (!walletId) return

    setBalanceChecking(false)
    setBalanceError('')
    try {
      const info = await apiGetCardBalance(walletId)
      if (info.exists) {
        const { apiGetCardInfo } = await import('@/lib/api-client')
        const full = await apiGetCardInfo(walletId).catch(() => null)
        setCheckedBalance({
          walletId,
          balance: info.balance,
          totalLoaded: full?.totalLoaded || '—',
          totalSpent: full?.totalSpent || '—',
        })
      } else {
        setBalanceError('Card not registered — use Admin to set up')
      }
    } catch (err) {
      setBalanceError(err instanceof Error ? err.message : 'Card read failed')
    }
  }, [flow, balanceChecking])

  // Combined NFC handler
  const onNfcTap = useCallback((uid: string, data?: { walletId: string }) => {
    if (flow === 'payment') handlePayNfcTap(uid, data)
    if (flow === 'topup') handleTopUpNfcTap(uid, data)
    if (flow === 'balance') handleBalanceNfcTap(uid, data)
  }, [flow, handlePayNfcTap, handleTopUpNfcTap, handleBalanceNfcTap])

  const nfcEnabled = (flow === 'payment' && payStep === 'tap-card') ||
    (flow === 'topup' && topUpStep === 'tap-card') ||
    (flow === 'balance' && balanceChecking)

  useNfcEvents({ onCardTapped: onNfcTap, enabled: nfcEnabled })

  // Coin events for self-service top-up
  useCoinEvents({
    onCoinInserted: (pesos, usdc) => {
      if (flow === 'topup' && topUpStep === 'insert-coins') {
        setCoinTotal((prev) => parseFloat((prev + usdc).toFixed(2)))
        setShowCoinAnim(true)
        setTimeout(() => setShowCoinAnim(false), 800)
      }
    },
  })

  // Start payment flow
  const startPayment = async () => {
    setFlow('payment')
    setPayStep('select-merchant')
    setCart([])
    setSelectedMerchant(null)
    setWalletId('')
    setManualWalletId('')
    setPin('')
    setPayResult(null)
    setPayError('')
    try {
      const res = await apiGetMerchants()
      setMerchants(res.merchants)
    } catch {}
  }

  // Start top-up flow
  const startTopUp = () => {
    setFlow('topup')
    setTopUpStep('insert-coins')
    setCoinTotal(0)
    setSimTopUpPesos(0)
    setSimTopUpUsdc(0)
    setCreatedWalletId('')
    setTopUpWalletId('')
    setTopUpNewBalance('')
    setTopUpError('')
  }

  // Start balance check flow
  const startBalanceCheck = () => {
    setFlow('balance')
    setBalanceChecking(true)
    setCheckedBalance(null)
    setBalanceError('')
    setBalanceWalletInput('')
  }

  const goHome = () => {
    setFlow('idle')
    setPayStep('select-merchant')
    setTopUpStep('insert-coins')
    setBalanceChecking(true)
    setCheckedBalance(null)
  }

  // Cart helpers
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id)
      if (existing) {
        return prev.map((i) => i.productId === product.id ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, qty: 1 }]
    })
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === productId)
      if (!existing) return prev
      if (existing.qty <= 1) return prev.filter((i) => i.productId !== productId)
      return prev.map((i) => i.productId === productId ? { ...i, qty: i.qty - 1 } : i)
    })
  }

  // Payment submit
  const handlePaySubmit = async () => {
    setPayStep('processing')
    try {
      const result = await apiFestivalPay(
        walletId,
        pin,
        selectedMerchant!.id,
        cartTotal.toFixed(2)
      )
      if (result.success) {
        setPayResult({
          txHash: result.txHash,
          explorerUrl: result.explorerUrl,
          newBalance: result.newBalance,
        })
        setPayStep('success')
      } else {
        setPayError(result.error || 'Payment failed')
        setPayStep('error')
      }
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Payment failed')
      setPayStep('error')
    }
  }

  // ============================================================
  // IDLE
  // ============================================================
  if (flow === 'idle') {
    return (
      <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
        <div className="flex items-center justify-between px-1">
          <Link
            href="/app/festival"
            className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
            style={{ color: '#7a7a9a', borderColor: '#7a7a9a' }}
          >
            ‹ Back
          </Link>
          <h1
            className="text-sm"
            style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
          >
            Festival Terminal
          </h1>
          <span className="w-12" />
        </div>

        <p className="text-[0.6875rem] uppercase tracking-wider text-center" style={{ color: '#7a7a9a' }}>
          Choose an action
        </p>

        <div className="flex-1 flex flex-col gap-4 justify-center w-full max-w-xs mx-auto">
          <ArcadeButton size="lg" variant="accent" onClick={startPayment} className="w-full">
            Pay
          </ArcadeButton>
          <ArcadeButton size="lg" variant="primary" onClick={startTopUp} className="w-full">
            Add Balance
          </ArcadeButton>
          <ArcadeButton size="lg" variant="secondary" onClick={startBalanceCheck} className="w-full">
            Check Balance
          </ArcadeButton>
        </div>
      </div>
    )
  }

  // ============================================================
  // PAYMENT FLOW
  // ============================================================
  if (flow === 'payment') {
    // Select merchant
    if (payStep === 'select-merchant') {
      return (
        <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
          <div className="flex items-center justify-between px-1">
            <button
              onClick={goHome}
              className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
              style={{ color: '#7a7a9a', borderColor: '#7a7a9a' }}
            >
              ‹ Back
            </button>
            <h1
              className="text-sm"
              style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
            >
              Select Merchant
            </h1>
            <span className="w-12" />
          </div>

          <div className="flex-1 flex flex-col gap-3 justify-center">
            {merchants.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setSelectedMerchant(m)
                  setCart([])
                  setPayStep('build-cart')
                }}
                className="p-3 border-2 text-left transition-all"
                style={{
                  backgroundColor: '#0f0f24',
                  borderColor: '#2a2a4a',
                  color: '#e0e8f0',
                }}
              >
                <p className="text-sm" style={{ color: '#f093fb' }}>{m.name}</p>
                <p className="text-[0.6875rem] uppercase mt-1" style={{ color: '#7a7a9a' }}>
                  {m.preferredChain}
                </p>
              </button>
            ))}
            {merchants.length === 0 && (
              <p className="text-[0.6875rem] uppercase text-center" style={{ color: '#7a7a9a' }}>
                No merchants configured
              </p>
            )}
          </div>
        </div>
      )
    }

    // Build cart
    if (payStep === 'build-cart' && selectedMerchant) {
      const products = MERCHANT_PRODUCTS[selectedMerchant.id] || []
      return (
        <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => setPayStep('select-merchant')}
              className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
              style={{ color: '#7a7a9a', borderColor: '#7a7a9a' }}
            >
              ‹ Back
            </button>
            <h1
              className="text-sm"
              style={{ color: '#f093fb', textShadow: '0 0 10px rgba(240, 147, 251, 0.5)' }}
            >
              {selectedMerchant.name}
            </h1>
            <button
              onClick={() => setPayStep('tap-card')}
              disabled={cartTotal <= 0}
              className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
              style={{ color: cartTotal > 0 ? '#ffd700' : '#3a3a5a', borderColor: cartTotal > 0 ? '#ffd700' : '#3a3a5a' }}
            >
              Pay ›
            </button>
          </div>

          <p className="text-[0.6875rem] uppercase tracking-wider text-center" style={{ color: '#7a7a9a' }}>
            Build your order
          </p>

          {/* Products */}
          <div className="flex flex-col gap-2 flex-1">
            {products.map((p) => {
              const inCart = cart.find((i) => i.productId === p.id)
              const qty = inCart?.qty || 0
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2 border-2"
                  style={{ backgroundColor: '#0f0f24', borderColor: qty > 0 ? '#667eea' : '#2a2a4a' }}
                >
                  <div>
                    <p className="text-xs" style={{ color: '#e0e8f0' }}>{p.name}</p>
                    <p className="text-[0.6875rem]" style={{ color: '#ffd700' }}>${p.price}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => removeFromCart(p.id)}
                      className="w-8 h-8 border-2 text-sm"
                      style={{
                        borderColor: '#2a2a4a',
                        backgroundColor: '#0f0f24',
                        color: qty > 0 ? '#ef4444' : '#3a3a5a',
                      }}
                      disabled={qty === 0}
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-sm" style={{ color: '#e0e8f0' }}>{qty}</span>
                    <button
                      onClick={() => addToCart(p)}
                      className="w-8 h-8 border-2 text-sm"
                      style={{
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        color: '#667eea',
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Cart total */}
          <div
            className="p-2 border-2 text-center"
            style={{
              backgroundColor: '#0f0f24',
              borderImage: 'linear-gradient(135deg, #78ffd6, #667eea, #ffd700) 1',
              borderStyle: 'solid',
              borderWidth: '2px',
            }}
          >
            <p className="text-[0.6875rem] uppercase mb-1" style={{ color: '#7a7a9a' }}>Order Total</p>
            <p className="text-lg" style={{ color: '#ffd700' }}>
              ${cartTotal.toFixed(2)} <span className="text-xs" style={{ color: '#7a7a9a' }}>USDC</span>
            </p>
          </div>
        </div>
      )
    }

    // Tap card
    if (payStep === 'tap-card') {
      const handleManualWalletSubmit = async () => {
        if (!manualWalletId) return
        // Simulate the NFC tap with the manual wallet ID
        handlePayNfcTap('manual', { walletId: manualWalletId })
      }

      return (
        <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => setPayStep('build-cart')}
              className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
              style={{ color: '#7a7a9a', borderColor: '#7a7a9a' }}
            >
              ‹ Back
            </button>
            <h1
              className="text-sm"
              style={{ color: '#f093fb', textShadow: '0 0 10px rgba(240, 147, 251, 0.5)' }}
            >
              {isOnlineDemo ? 'Enter Wallet ID' : 'Tap Wristband'}
            </h1>
            {isOnlineDemo ? (
              <button
                onClick={handleManualWalletSubmit}
                disabled={!manualWalletId}
                className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
                style={{ color: manualWalletId ? '#ffd700' : '#3a3a5a', borderColor: manualWalletId ? '#ffd700' : '#3a3a5a' }}
              >
                Submit ›
              </button>
            ) : (
              <span className="w-12" />
            )}
          </div>

          <p className="text-[0.6875rem] uppercase tracking-wider text-center" style={{ color: '#7a7a9a' }}>
            {isOnlineDemo ? `Enter wallet ID to pay $${cartTotal.toFixed(2)}` : `Hold near reader to pay $${cartTotal.toFixed(2)}`}
          </p>

          {isOnlineDemo ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="w-full max-w-xs">
                <input
                  type="text"
                  value={manualWalletId}
                  onChange={(e) => setManualWalletId(e.target.value.toUpperCase())}
                  placeholder="e.g. A1B2C3"
                  maxLength={WALLET_ID_LENGTH}
                  className="w-full p-3 text-center text-sm font-mono tracking-wider uppercase border-2"
                  style={{
                    backgroundColor: '#0f0f24',
                    borderColor: '#667eea',
                    color: '#e0e8f0',
                    outline: 'none',
                  }}
                />
              </div>
              <p className="text-[0.625rem] uppercase text-center" style={{ color: '#7a7a9a' }}>
                Enter the wallet ID from your top-up receipt
              </p>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <NFCIndicator status="scanning" />
            </div>
          )}
        </div>
      )
    }

    // Enter PIN
    if (payStep === 'enter-pin') {
      return (
        <div className="h-full flex flex-col p-2 gap-1 overflow-hidden">
          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => { setPayStep('tap-card'); setPin('') }}
              className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
              style={{ color: '#7a7a9a', borderColor: '#7a7a9a' }}
            >
              ‹ Cancel
            </button>
            <h1
              className="text-sm"
              style={{ color: '#667eea', textShadow: '0 0 10px rgba(102, 126, 234, 0.5)' }}
            >
              Enter PIN
            </h1>
            <button
              onClick={() => setPayStep('confirm')}
              disabled={pin.length < 4}
              className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
              style={{ color: pin.length >= 4 ? '#ffd700' : '#3a3a5a', borderColor: pin.length >= 4 ? '#ffd700' : '#3a3a5a' }}
            >
              Next ›
            </button>
          </div>

          <div
            className="p-1 border-2 text-center"
            style={{ backgroundColor: '#0f0f24', borderColor: '#667eea' }}
          >
            <span className="text-[0.6875rem] uppercase tracking-widest" style={{ color: '#7a7a9a' }}>
              Card: {walletId} | Balance: ${cardBalance}
            </span>
          </div>

          <div className="flex-1 flex items-center justify-center min-h-0">
            <NumericKeypad value={pin} onChange={setPin} maxLength={6} isPin />
          </div>
        </div>
      )
    }

    // Confirm
    if (payStep === 'confirm') {
      return (
        <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => setPayStep('enter-pin')}
              className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
              style={{ color: '#7a7a9a', borderColor: '#7a7a9a' }}
            >
              ‹ Back
            </button>
            <h1
              className="text-sm"
              style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
            >
              Confirm Payment
            </h1>
            <button
              onClick={handlePaySubmit}
              className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
              style={{ color: '#ffd700', borderColor: '#ffd700' }}
            >
              Pay ›
            </button>
          </div>

          <div className="flex-1 flex flex-col gap-2 justify-center">
            <div className="p-2 border-2" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
              <p className="text-[0.6875rem] uppercase mb-1" style={{ color: '#7a7a9a' }}>Merchant</p>
              <p className="text-sm" style={{ color: '#f093fb' }}>{selectedMerchant?.name}</p>
            </div>

            <div className="p-2 border-2" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
              <p className="text-[0.6875rem] uppercase mb-1" style={{ color: '#7a7a9a' }}>Items</p>
              {cart.filter((i) => i.qty > 0).map((item) => (
                <div key={item.productId} className="flex justify-between text-xs mb-1">
                  <span style={{ color: '#e0e8f0' }}>{item.name} x{item.qty}</span>
                  <span style={{ color: '#ffd700' }}>${(parseFloat(item.price) * item.qty).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div
              className="p-2 border-2 text-center"
              style={{
                backgroundColor: '#0f0f24',
                borderImage: 'linear-gradient(135deg, #78ffd6, #667eea, #ffd700) 1',
                borderStyle: 'solid',
                borderWidth: '2px',
              }}
            >
              <p className="text-[0.6875rem] uppercase mb-1" style={{ color: '#7a7a9a' }}>Total</p>
              <p className="text-lg" style={{ color: '#ffd700' }}>${cartTotal.toFixed(2)} USDC</p>
              <p className="text-[0.6875rem] mt-1" style={{ color: '#7a7a9a' }}>
                Balance after: ${(parseFloat(cardBalance) - cartTotal).toFixed(2)} USDC
              </p>
            </div>
          </div>
        </div>
      )
    }

    // Processing
    if (payStep === 'processing') {
      return (
        <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
          <div className="flex items-center justify-between px-1">
            <span className="w-12" />
            <h1
              className="text-sm"
              style={{ color: '#667eea', textShadow: '0 0 10px rgba(102, 126, 234, 0.5)' }}
            >
              Processing
            </h1>
            <span className="w-12" />
          </div>

          <p className="text-[0.6875rem] uppercase tracking-wider text-center" style={{ color: '#7a7a9a' }}>
            Gateway burn + mint...
          </p>

          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-xs">
              <ProgressBar progress={0} isAnimating={true} />
            </div>
          </div>
        </div>
      )
    }

    // Success
    if (payStep === 'success' && payResult) {
      return (
        <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
          <div className="flex items-center justify-between px-1">
            <span className="w-12" />
            <h1
              className="text-sm"
              style={{ color: '#78ffd6', textShadow: '0 0 10px rgba(120, 255, 214, 0.5)' }}
            >
              Payment Successful
            </h1>
            <button
              onClick={goHome}
              className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
              style={{ color: '#ffd700', borderColor: '#ffd700' }}
            >
              Done ›
            </button>
          </div>

          <div className="flex-1 flex flex-col gap-2 justify-center">
            <div className="p-3 border-2 text-center" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
              <p className="text-[0.6875rem] uppercase mb-1" style={{ color: '#7a7a9a' }}>Remaining Balance</p>
              <p className="text-lg" style={{ color: '#ffd700' }}>${payResult.newBalance} USDC</p>
            </div>

            {payResult.txHash && (
              <div className="p-2 border-2" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
                <p className="text-[0.6875rem] uppercase mb-1" style={{ color: '#7a7a9a' }}>TX Hash</p>
                <p className="text-[0.6875rem] break-all" style={{ color: '#667eea' }}>{payResult.txHash}</p>
              </div>
            )}

            {payResult.explorerUrl && (
              <div className="flex flex-col items-center gap-2">
                <div className="bg-white p-1.5">
                  <QRCodeSVG value={payResult.explorerUrl} size={80} />
                </div>
                <a
                  href={payResult.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[0.6875rem] uppercase underline block text-center"
                  style={{ color: '#667eea' }}
                >
                  View on Explorer
                </a>
              </div>
            )}
          </div>
        </div>
      )
    }

    // Error
    if (payStep === 'error') {
      return (
        <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
          <div className="flex items-center justify-between px-1">
            <span className="w-12" />
            <h1
              className="text-sm"
              style={{ color: '#ef4444' }}
            >
              Payment Failed
            </h1>
            <button
              onClick={goHome}
              className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
              style={{ color: '#7a7a9a', borderColor: '#7a7a9a' }}
            >
              Retry ›
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-center max-w-xs" style={{ color: '#ef4444' }}>{payError}</p>
          </div>
        </div>
      )
    }
  }

  // ============================================================
  // TOP-UP FLOW
  // ============================================================
  if (flow === 'topup') {
    // Insert coins
    if (topUpStep === 'insert-coins') {
      const effectiveTotal = isOnlineDemo ? simTopUpUsdc : coinTotal

      return (
        <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
          <div className="flex items-center justify-between px-1">
            <button
              onClick={goHome}
              className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
              style={{ color: '#7a7a9a', borderColor: '#7a7a9a' }}
            >
              ‹ Cancel
            </button>
            <h1
              className="text-sm"
              style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
            >
              Insert Coins
            </h1>
            <button
              onClick={() => {
                if (isOnlineDemo) setCoinTotal(simTopUpUsdc)
                setTopUpStep('tap-card')
              }}
              disabled={effectiveTotal <= 0}
              className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
              style={{ color: effectiveTotal > 0 ? '#ffd700' : '#3a3a5a', borderColor: effectiveTotal > 0 ? '#ffd700' : '#3a3a5a' }}
            >
              Next ›
            </button>
          </div>

          <p className="text-[0.6875rem] uppercase tracking-wider text-center" style={{ color: '#7a7a9a' }}>
            {isOnlineDemo ? 'Tap a coin to simulate insertion' : 'Insert coins into the slot'}
          </p>

          {isOnlineDemo ? (
            <div className="flex-1 min-h-0">
              <CoinSlotSimulator
                onCoinInserted={(pesos, usdc) => {
                  if (simTopUpUsdc + usdc > ONLINE_MAX_USDC) return
                  setSimTopUpPesos((p) => p + pesos)
                  setSimTopUpUsdc((p) => parseFloat((p + usdc).toFixed(2)))
                  setCoinTotal(parseFloat((simTopUpUsdc + usdc).toFixed(2)))
                }}
                totalPesos={simTopUpPesos}
                totalUSDC={simTopUpUsdc}
                disabled={simTopUpUsdc >= ONLINE_MAX_USDC}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <CoinAnimation isAnimating={showCoinAnim} amount={coinTotal} />

              <div
                className="p-3 border-2 text-center w-full max-w-xs"
                style={{
                  backgroundColor: '#0f0f24',
                  borderImage: 'linear-gradient(135deg, #78ffd6, #667eea, #ffd700) 1',
                  borderStyle: 'solid',
                  borderWidth: '2px',
                }}
              >
                <p className="text-[0.6875rem] uppercase mb-1" style={{ color: '#7a7a9a' }}>Total Inserted</p>
                <p className="text-xl" style={{ color: '#ffd700' }}>
                  ${coinTotal.toFixed(2)} <span className="text-xs" style={{ color: '#7a7a9a' }}>USDC</span>
                </p>
              </div>
            </div>
          )}
        </div>
      )
    }

    // Tap card for top-up
    if (topUpStep === 'tap-card') {
      const handleOnlineCreateAndTopUp = async () => {
        setTopUpCreating(true)
        try {
          const wid = generateWalletId()
          await apiCreateCardWithId(wid)
          await apiSetCardPin(wid, DEMO_PIN)
          setTopUpWalletId(wid)
          setCreatedWalletId(wid)
          setTopUpStep('processing')
          const result = await apiTopUpCard(wid, coinTotal.toFixed(2))
          if (result.success) {
            setTopUpNewBalance(result.newBalance)
            setTopUpStep('success')
          } else {
            setTopUpError(result.message)
            setTopUpStep('error')
          }
        } catch (err) {
          setTopUpError(err instanceof Error ? err.message : 'Failed to create wallet')
          setTopUpStep('error')
        } finally {
          setTopUpCreating(false)
        }
      }

      return (
        <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => setTopUpStep('insert-coins')}
              className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
              style={{ color: '#7a7a9a', borderColor: '#7a7a9a' }}
            >
              ‹ Back
            </button>
            <h1
              className="text-sm"
              style={{ color: '#f093fb', textShadow: '0 0 10px rgba(240, 147, 251, 0.5)' }}
            >
              {isOnlineDemo ? 'Create Wallet' : 'Tap Wristband'}
            </h1>
            <span className="w-12" />
          </div>

          <p className="text-[0.6875rem] uppercase tracking-wider text-center" style={{ color: '#7a7a9a' }}>
            {isOnlineDemo ? `Creating wallet with $${coinTotal.toFixed(2)} USDC` : `Hold near reader to add $${coinTotal.toFixed(2)}`}
          </p>

          {isOnlineDemo ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <ArcadeButton
                size="lg"
                variant="primary"
                onClick={handleOnlineCreateAndTopUp}
                disabled={topUpCreating}
                className="w-full max-w-xs"
              >
                {topUpCreating ? 'Creating...' : 'Create Wallet & Top Up'}
              </ArcadeButton>
              <p className="text-[0.625rem] uppercase text-center" style={{ color: '#7a7a9a' }}>
                Auto-generates wallet ID with PIN: {DEMO_PIN}
              </p>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <NFCIndicator status="scanning" />
            </div>
          )}
        </div>
      )
    }

    // Processing
    if (topUpStep === 'processing') {
      return (
        <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
          <div className="flex items-center justify-between px-1">
            <span className="w-12" />
            <h1
              className="text-sm"
              style={{ color: '#667eea', textShadow: '0 0 10px rgba(102, 126, 234, 0.5)' }}
            >
              Adding Balance
            </h1>
            <span className="w-12" />
          </div>

          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-xs">
              <ProgressBar progress={0} isAnimating={true} />
            </div>
          </div>
        </div>
      )
    }

    // Success
    if (topUpStep === 'success') {
      return (
        <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
          <div className="flex items-center justify-between px-1">
            <span className="w-12" />
            <h1
              className="text-sm"
              style={{ color: '#78ffd6', textShadow: '0 0 10px rgba(120, 255, 214, 0.5)' }}
            >
              Balance Added
            </h1>
            <button
              onClick={goHome}
              className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
              style={{ color: '#ffd700', borderColor: '#ffd700' }}
            >
              Done ›
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div
              className="w-16 h-16 flex items-center justify-center"
              style={{
                border: '4px solid #78ffd6',
                boxShadow: '0 0 12px rgba(120, 255, 214, 0.4)',
              }}
            >
              <span className="text-2xl" style={{ color: '#78ffd6' }}>+</span>
            </div>

            <p className="text-lg" style={{ color: '#ffd700' }}>
              New Balance: ${topUpNewBalance} USDC
            </p>

            {isOnlineDemo && createdWalletId && (
              <div className="w-full max-w-xs space-y-2">
                <div className="p-2 border-2 text-center" style={{ backgroundColor: '#0f0f24', borderColor: '#667eea' }}>
                  <p className="text-[0.6875rem] uppercase mb-1" style={{ color: '#7a7a9a' }}>Wallet ID</p>
                  <p className="text-sm font-mono tracking-wider" style={{ color: '#667eea' }}>{createdWalletId}</p>
                </div>
                <div className="p-2 border-2 text-center" style={{ backgroundColor: '#0f0f24', borderColor: '#ffd700' }}>
                  <p className="text-[0.6875rem] uppercase mb-1" style={{ color: '#7a7a9a' }}>PIN</p>
                  <p className="text-sm font-mono tracking-[0.3em]" style={{ color: '#ffd700' }}>{DEMO_PIN}</p>
                </div>
                <p className="text-[0.625rem] uppercase text-center" style={{ color: '#f093fb' }}>
                  Save this wallet ID & PIN to use for payments
                </p>
              </div>
            )}
          </div>
        </div>
      )
    }

    // Error
    if (topUpStep === 'error') {
      return (
        <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
          <div className="flex items-center justify-between px-1">
            <span className="w-12" />
            <h1
              className="text-sm"
              style={{ color: '#ef4444' }}
            >
              Top-Up Failed
            </h1>
            <button
              onClick={goHome}
              className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
              style={{ color: '#7a7a9a', borderColor: '#7a7a9a' }}
            >
              Retry ›
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-center" style={{ color: '#ef4444' }}>{topUpError}</p>
          </div>
        </div>
      )
    }
  }

  // ============================================================
  // BALANCE CHECK FLOW
  // ============================================================
  if (flow === 'balance') {
    const handleOnlineBalanceCheck = async () => {
      if (!balanceWalletInput) return
      setBalanceChecking(false)
      setBalanceError('')
      try {
        const info = await apiGetCardBalance(balanceWalletInput)
        if (info.exists) {
          const full = await apiGetCardInfo(balanceWalletInput).catch(() => null)
          setCheckedBalance({
            walletId: balanceWalletInput,
            balance: info.balance,
            totalLoaded: full?.totalLoaded || '—',
            totalSpent: full?.totalSpent || '—',
          })
        } else {
          setBalanceError('Wallet not found')
        }
      } catch (err) {
        setBalanceError(err instanceof Error ? err.message : 'Check failed')
      }
    }

    if (balanceChecking && !checkedBalance) {
      return (
        <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
          <div className="flex items-center justify-between px-1">
            <button
              onClick={goHome}
              className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
              style={{ color: '#7a7a9a', borderColor: '#7a7a9a' }}
            >
              ‹ Back
            </button>
            <h1
              className="text-sm"
              style={{ color: '#667eea', textShadow: '0 0 10px rgba(102, 126, 234, 0.5)' }}
            >
              Check Balance
            </h1>
            {isOnlineDemo ? (
              <button
                onClick={handleOnlineBalanceCheck}
                disabled={!balanceWalletInput}
                className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
                style={{ color: balanceWalletInput ? '#ffd700' : '#3a3a5a', borderColor: balanceWalletInput ? '#ffd700' : '#3a3a5a' }}
              >
                Check ›
              </button>
            ) : (
              <span className="w-12" />
            )}
          </div>

          <p className="text-[0.6875rem] uppercase tracking-wider text-center" style={{ color: '#7a7a9a' }}>
            {isOnlineDemo ? 'Enter wallet ID to view balance' : 'Tap your wristband to view balance'}
          </p>

          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            {isOnlineDemo ? (
              <>
                <div className="w-full max-w-xs">
                  <input
                    type="text"
                    value={balanceWalletInput}
                    onChange={(e) => setBalanceWalletInput(e.target.value.toUpperCase())}
                    placeholder="e.g. A1B2C3"
                    maxLength={WALLET_ID_LENGTH}
                    className="w-full p-3 text-center text-sm font-mono tracking-wider uppercase border-2"
                    style={{
                      backgroundColor: '#0f0f24',
                      borderColor: '#667eea',
                      color: '#e0e8f0',
                      outline: 'none',
                    }}
                  />
                </div>
              </>
            ) : (
              <NFCIndicator status="scanning" />
            )}
            {balanceError && (
              <p className="text-sm text-center" style={{ color: '#ef4444' }}>{balanceError}</p>
            )}
          </div>
        </div>
      )
    }

    if (checkedBalance) {
      return (
        <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
          <div className="flex items-center justify-between px-1">
            <button
              onClick={startBalanceCheck}
              className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
              style={{ color: '#7a7a9a', borderColor: '#7a7a9a' }}
            >
              ‹ Scan Again
            </button>
            <h1
              className="text-sm"
              style={{ color: '#667eea', textShadow: '0 0 10px rgba(102, 126, 234, 0.5)' }}
            >
              Balance
            </h1>
            <button
              onClick={goHome}
              className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
              style={{ color: '#ffd700', borderColor: '#ffd700' }}
            >
              Done ›
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="p-2 border-2 text-center w-full max-w-xs" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
              <p className="text-[0.6875rem] uppercase mb-1" style={{ color: '#7a7a9a' }}>Card ID</p>
              <p className="text-sm" style={{ color: '#667eea' }}>{checkedBalance.walletId}</p>
            </div>

            <div
              className="p-3 border-2 text-center w-full max-w-xs"
              style={{
                backgroundColor: '#0f0f24',
                borderImage: 'linear-gradient(135deg, #78ffd6, #667eea, #ffd700) 1',
                borderStyle: 'solid',
                borderWidth: '2px',
              }}
            >
              <p className="text-[0.6875rem] uppercase mb-1" style={{ color: '#7a7a9a' }}>Current Balance</p>
              <p className="text-xl" style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}>
                ${checkedBalance.balance} <span className="text-xs" style={{ color: '#7a7a9a' }}>USDC</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
              <div className="p-2 border-2 text-center" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
                <p className="text-[0.6875rem] uppercase mb-1" style={{ color: '#7a7a9a' }}>Loaded</p>
                <p className="text-sm" style={{ color: '#78ffd6' }}>${checkedBalance.totalLoaded}</p>
              </div>
              <div className="p-2 border-2 text-center" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
                <p className="text-[0.6875rem] uppercase mb-1" style={{ color: '#7a7a9a' }}>Spent</p>
                <p className="text-sm" style={{ color: '#f093fb' }}>${checkedBalance.totalSpent}</p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (balanceError) {
      return (
        <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
          <div className="flex items-center justify-between px-1">
            <button
              onClick={startBalanceCheck}
              className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
              style={{ color: '#7a7a9a', borderColor: '#7a7a9a' }}
            >
              ‹ Retry
            </button>
            <h1
              className="text-sm"
              style={{ color: '#ef4444' }}
            >
              Card Not Found
            </h1>
            <button
              onClick={goHome}
              className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
              style={{ color: '#7a7a9a', borderColor: '#7a7a9a' }}
            >
              Home ›
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-center" style={{ color: '#ef4444' }}>{balanceError}</p>
          </div>
        </div>
      )
    }
  }

  return null
}
