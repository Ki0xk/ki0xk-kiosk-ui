'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { ArcadeButton } from '@/components/ki0xk/ArcadeButton'
import { NFCIndicator } from '@/components/ki0xk/NFCIndicator'
import { ProgressBar } from '@/components/ki0xk/ProgressBar'
import { NumericKeypad } from '@/components/ki0xk/NumericKeypad'
import { CoinAnimation } from '@/components/ki0xk/CoinAnimation'
import { useNfcEvents } from '@/hooks/use-nfc-events'
import { useCoinEvents } from '@/hooks/use-coin-events'
import { MERCHANT_PRODUCTS, type Product } from '@/lib/constants'
import {
  apiGetCardBalance,
  apiGetMerchants,
  apiFestivalPay,
  apiTopUpCard,
} from '@/lib/api-client'

type Flow = 'idle' | 'payment' | 'topup'

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

export default function FestivalPublicPage() {
  const [flow, setFlow] = useState<Flow>('idle')

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

  // Combined NFC handler
  const onNfcTap = useCallback((uid: string, data?: { walletId: string }) => {
    if (flow === 'payment') handlePayNfcTap(uid, data)
    if (flow === 'topup') handleTopUpNfcTap(uid, data)
  }, [flow, handlePayNfcTap, handleTopUpNfcTap])

  const nfcEnabled = (flow === 'payment' && payStep === 'tap-card') ||
    (flow === 'topup' && topUpStep === 'tap-card')

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
    setTopUpWalletId('')
    setTopUpNewBalance('')
    setTopUpError('')
  }

  const goHome = () => {
    setFlow('idle')
    setPayStep('select-merchant')
    setTopUpStep('insert-coins')
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

  // IDLE
  if (flow === 'idle') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 gap-6">
        <div className="text-center space-y-2">
          <h1
            className="text-xl"
            style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
          >
            Festival Terminal
          </h1>
          <p className="text-[8px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
            Choose an action
          </p>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-xs">
          <ArcadeButton size="lg" variant="accent" onClick={startPayment} className="w-full">
            Pay
          </ArcadeButton>
          <ArcadeButton size="lg" variant="primary" onClick={startTopUp} className="w-full">
            Add Balance
          </ArcadeButton>
        </div>

        <Link href="/app/festival" className="mt-4">
          <span className="text-[8px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>Back</span>
        </Link>
      </div>
    )
  }

  // PAYMENT FLOW
  if (flow === 'payment') {
    // Select merchant
    if (payStep === 'select-merchant') {
      return (
        <div className="h-full flex flex-col p-4 gap-4">
          <div className="text-center">
            <h2 className="text-sm" style={{ color: '#ffd700' }}>Select Merchant</h2>
          </div>

          <div className="grid grid-cols-1 gap-3 flex-1">
            {merchants.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setSelectedMerchant(m)
                  setCart([])
                  setPayStep('build-cart')
                }}
                className="p-4 border-2 text-left transition-all"
                style={{
                  backgroundColor: '#0f0f24',
                  borderColor: '#2a2a4a',
                  color: '#e0e8f0',
                }}
              >
                <p className="text-sm" style={{ color: '#f093fb' }}>{m.name}</p>
                <p className="text-[8px] uppercase mt-1" style={{ color: '#7a7a9a' }}>
                  {m.preferredChain}
                </p>
              </button>
            ))}
            {merchants.length === 0 && (
              <p className="text-[8px] uppercase text-center" style={{ color: '#7a7a9a' }}>
                No merchants configured
              </p>
            )}
          </div>

          <ArcadeButton size="sm" variant="secondary" onClick={goHome} className="w-full">
            Back
          </ArcadeButton>
        </div>
      )
    }

    // Build cart
    if (payStep === 'build-cart' && selectedMerchant) {
      const products = MERCHANT_PRODUCTS[selectedMerchant.id] || []
      return (
        <div className="h-full flex flex-col p-4 gap-3">
          <div className="text-center">
            <h2 className="text-sm" style={{ color: '#f093fb' }}>{selectedMerchant.name}</h2>
            <p className="text-[8px] uppercase mt-1" style={{ color: '#7a7a9a' }}>
              Build your order
            </p>
          </div>

          {/* Products */}
          <div className="flex flex-col gap-2 flex-1">
            {products.map((p) => {
              const inCart = cart.find((i) => i.productId === p.id)
              const qty = inCart?.qty || 0
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 border-2"
                  style={{ backgroundColor: '#0f0f24', borderColor: qty > 0 ? '#667eea' : '#2a2a4a' }}
                >
                  <div>
                    <p className="text-xs" style={{ color: '#e0e8f0' }}>{p.name}</p>
                    <p className="text-[8px]" style={{ color: '#ffd700' }}>${p.price}</p>
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
            className="p-3 border-2 text-center"
            style={{
              backgroundColor: '#0f0f24',
              borderImage: 'linear-gradient(135deg, #78ffd6, #667eea, #ffd700) 1',
              borderStyle: 'solid',
              borderWidth: '2px',
            }}
          >
            <p className="text-[8px] uppercase mb-1" style={{ color: '#7a7a9a' }}>Order Total</p>
            <p className="text-xl" style={{ color: '#ffd700' }}>
              ${cartTotal.toFixed(2)} <span className="text-xs" style={{ color: '#7a7a9a' }}>USDC</span>
            </p>
          </div>

          <ArcadeButton
            size="md"
            variant="accent"
            onClick={() => setPayStep('tap-card')}
            disabled={cartTotal <= 0}
            className="w-full"
          >
            {'Tap to Pay $'}{cartTotal.toFixed(2)}
          </ArcadeButton>

          <button
            onClick={() => setPayStep('select-merchant')}
            className="text-[8px] uppercase tracking-wider text-center"
            style={{ color: '#7a7a9a' }}
          >
            Back
          </button>
        </div>
      )
    }

    // Tap card
    if (payStep === 'tap-card') {
      return (
        <div className="h-full flex flex-col items-center justify-center p-6 gap-6">
          <div className="text-center space-y-2">
            <h2 className="text-sm" style={{ color: '#f093fb' }}>Tap Your Wristband</h2>
            <p className="text-[8px] uppercase" style={{ color: '#7a7a9a' }}>
              {'Hold near reader to pay $'}{cartTotal.toFixed(2)}
            </p>
          </div>
          <NFCIndicator status="scanning" />
          <ArcadeButton size="sm" variant="secondary" onClick={() => setPayStep('build-cart')}>
            Back
          </ArcadeButton>
        </div>
      )
    }

    // Enter PIN
    if (payStep === 'enter-pin') {
      return (
        <div className="h-full flex flex-col items-center justify-center p-6 gap-4">
          <div className="text-center space-y-2">
            <h2 className="text-sm" style={{ color: '#667eea' }}>Enter Your PIN</h2>
            <p className="text-[8px] uppercase" style={{ color: '#7a7a9a' }}>
              Card: {walletId} | Balance: ${cardBalance}
            </p>
          </div>

          <div className="w-full max-w-xs">
            <NumericKeypad value={pin} onChange={setPin} maxLength={6} isPin />
          </div>

          <ArcadeButton
            size="md"
            variant="primary"
            onClick={() => setPayStep('confirm')}
            disabled={pin.length < 4}
            className="w-full max-w-xs"
          >
            Continue
          </ArcadeButton>

          <button
            onClick={() => { setPayStep('tap-card'); setPin('') }}
            className="text-[8px] uppercase"
            style={{ color: '#7a7a9a' }}
          >
            Cancel
          </button>
        </div>
      )
    }

    // Confirm
    if (payStep === 'confirm') {
      return (
        <div className="h-full flex flex-col p-4 gap-3 overflow-y-auto">
          <div className="text-center">
            <h2 className="text-sm" style={{ color: '#ffd700' }}>Confirm Payment</h2>
          </div>

          <div className="p-3 border-2" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
            <p className="text-[8px] uppercase mb-1" style={{ color: '#7a7a9a' }}>Merchant</p>
            <p className="text-sm" style={{ color: '#f093fb' }}>{selectedMerchant?.name}</p>
          </div>

          <div className="p-3 border-2" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
            <p className="text-[8px] uppercase mb-2" style={{ color: '#7a7a9a' }}>Items</p>
            {cart.filter((i) => i.qty > 0).map((item) => (
              <div key={item.productId} className="flex justify-between text-xs mb-1">
                <span style={{ color: '#e0e8f0' }}>{item.name} x{item.qty}</span>
                <span style={{ color: '#ffd700' }}>${(parseFloat(item.price) * item.qty).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div
            className="p-3 border-2 text-center"
            style={{
              backgroundColor: '#0f0f24',
              borderImage: 'linear-gradient(135deg, #78ffd6, #667eea, #ffd700) 1',
              borderStyle: 'solid',
              borderWidth: '2px',
            }}
          >
            <p className="text-[8px] uppercase mb-1" style={{ color: '#7a7a9a' }}>Total</p>
            <p className="text-xl" style={{ color: '#ffd700' }}>${cartTotal.toFixed(2)} USDC</p>
            <p className="text-[8px] mt-1" style={{ color: '#7a7a9a' }}>
              Balance after: ${(parseFloat(cardBalance) - cartTotal).toFixed(2)} USDC
            </p>
          </div>

          <ArcadeButton size="md" variant="accent" onClick={handlePaySubmit} className="w-full">
            Confirm & Pay
          </ArcadeButton>

          <button
            onClick={() => setPayStep('enter-pin')}
            className="text-[8px] uppercase text-center"
            style={{ color: '#7a7a9a' }}
          >
            Back
          </button>
        </div>
      )
    }

    // Processing
    if (payStep === 'processing') {
      return (
        <div className="h-full flex flex-col items-center justify-center p-6 gap-6">
          <div className="text-center space-y-2">
            <h2 className="text-sm" style={{ color: '#667eea' }}>Processing Payment</h2>
            <p className="text-[8px] uppercase" style={{ color: '#7a7a9a' }}>
              Gateway burn + mint...
            </p>
          </div>
          <div className="w-full max-w-xs">
            <ProgressBar progress={0} isAnimating={true} />
          </div>
        </div>
      )
    }

    // Success
    if (payStep === 'success' && payResult) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-6 gap-4 overflow-y-auto">
          <div
            className="w-16 h-16 flex items-center justify-center"
            style={{
              border: '4px solid #78ffd6',
              boxShadow: '0 0 12px rgba(120, 255, 214, 0.4)',
            }}
          >
            <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="#78ffd6" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <div className="text-center space-y-3 w-full max-w-xs">
            <h2 className="text-sm" style={{ color: '#78ffd6' }}>Payment Successful</h2>

            <div className="p-3 border-2" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
              <p className="text-[8px] uppercase mb-1" style={{ color: '#7a7a9a' }}>Remaining Balance</p>
              <p className="text-lg" style={{ color: '#ffd700' }}>${payResult.newBalance} USDC</p>
            </div>

            {payResult.txHash && (
              <div className="p-3 border-2" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
                <p className="text-[8px] uppercase mb-1" style={{ color: '#7a7a9a' }}>TX Hash</p>
                <p className="text-[8px] break-all" style={{ color: '#667eea' }}>{payResult.txHash}</p>
              </div>
            )}

            {payResult.explorerUrl && (
              <a
                href={payResult.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[8px] uppercase underline block"
                style={{ color: '#667eea' }}
              >
                View on Explorer
              </a>
            )}
          </div>

          <ArcadeButton size="md" variant="primary" onClick={goHome} className="w-full max-w-xs mt-2">
            Done
          </ArcadeButton>
        </div>
      )
    }

    // Error
    if (payStep === 'error') {
      return (
        <div className="h-full flex flex-col items-center justify-center p-6 gap-4">
          <h2 className="text-sm" style={{ color: '#ef4444' }}>Payment Failed</h2>
          <p className="text-[10px] text-center max-w-xs" style={{ color: '#ef4444' }}>{payError}</p>
          <ArcadeButton size="md" variant="secondary" onClick={goHome}>
            Try Again
          </ArcadeButton>
        </div>
      )
    }
  }

  // TOP-UP FLOW
  if (flow === 'topup') {
    // Insert coins
    if (topUpStep === 'insert-coins') {
      return (
        <div className="h-full flex flex-col items-center justify-center p-6 gap-4">
          <div className="text-center space-y-2">
            <h2 className="text-sm" style={{ color: '#ffd700' }}>Insert Coins</h2>
            <p className="text-[8px] uppercase" style={{ color: '#7a7a9a' }}>
              Insert coins into the slot
            </p>
          </div>

          <CoinAnimation isAnimating={showCoinAnim} amount={coinTotal} />

          <div
            className="p-4 border-2 text-center w-full max-w-xs"
            style={{
              backgroundColor: '#0f0f24',
              borderImage: 'linear-gradient(135deg, #78ffd6, #667eea, #ffd700) 1',
              borderStyle: 'solid',
              borderWidth: '2px',
            }}
          >
            <p className="text-[8px] uppercase mb-1" style={{ color: '#7a7a9a' }}>Total Inserted</p>
            <p className="text-2xl" style={{ color: '#ffd700' }}>
              ${coinTotal.toFixed(2)} <span className="text-xs" style={{ color: '#7a7a9a' }}>USDC</span>
            </p>
          </div>

          <ArcadeButton
            size="md"
            variant="accent"
            onClick={() => setTopUpStep('tap-card')}
            disabled={coinTotal <= 0}
            className="w-full max-w-xs"
          >
            {'Tap Card to Add $'}{coinTotal.toFixed(2)}
          </ArcadeButton>

          <button
            onClick={goHome}
            className="text-[8px] uppercase"
            style={{ color: '#7a7a9a' }}
          >
            Cancel
          </button>
        </div>
      )
    }

    // Tap card for top-up
    if (topUpStep === 'tap-card') {
      return (
        <div className="h-full flex flex-col items-center justify-center p-6 gap-6">
          <div className="text-center space-y-2">
            <h2 className="text-sm" style={{ color: '#f093fb' }}>Tap Your Wristband</h2>
            <p className="text-[8px] uppercase" style={{ color: '#7a7a9a' }}>
              {'Hold near reader to add $'}{coinTotal.toFixed(2)}
            </p>
          </div>
          <NFCIndicator status="scanning" />
          <ArcadeButton size="sm" variant="secondary" onClick={() => setTopUpStep('insert-coins')}>
            Back
          </ArcadeButton>
        </div>
      )
    }

    // Processing
    if (topUpStep === 'processing') {
      return (
        <div className="h-full flex flex-col items-center justify-center p-6 gap-6">
          <h2 className="text-sm" style={{ color: '#667eea' }}>Adding Balance...</h2>
          <div className="w-full max-w-xs">
            <ProgressBar progress={0} isAnimating={true} />
          </div>
        </div>
      )
    }

    // Success
    if (topUpStep === 'success') {
      return (
        <div className="h-full flex flex-col items-center justify-center p-6 gap-4">
          <div
            className="w-16 h-16 flex items-center justify-center"
            style={{
              border: '4px solid #78ffd6',
              boxShadow: '0 0 12px rgba(120, 255, 214, 0.4)',
            }}
          >
            <span className="text-2xl" style={{ color: '#78ffd6' }}>+</span>
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-sm" style={{ color: '#78ffd6' }}>Balance Added</h2>
            <p className="text-lg" style={{ color: '#ffd700' }}>
              New Balance: ${topUpNewBalance} USDC
            </p>
          </div>

          <ArcadeButton size="md" variant="primary" onClick={goHome} className="w-full max-w-xs mt-2">
            Done
          </ArcadeButton>
        </div>
      )
    }

    // Error
    if (topUpStep === 'error') {
      return (
        <div className="h-full flex flex-col items-center justify-center p-6 gap-4">
          <h2 className="text-sm" style={{ color: '#ef4444' }}>Top-Up Failed</h2>
          <p className="text-[10px] text-center" style={{ color: '#ef4444' }}>{topUpError}</p>
          <ArcadeButton size="md" variant="secondary" onClick={goHome}>
            Try Again
          </ArcadeButton>
        </div>
      )
    }
  }

  return null
}
