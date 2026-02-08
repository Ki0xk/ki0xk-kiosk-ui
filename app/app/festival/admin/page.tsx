'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { ArcadeButton } from '@/components/ki0xk/ArcadeButton'
import { NumericKeypad } from '@/components/ki0xk/NumericKeypad'
import { NFCIndicator } from '@/components/ki0xk/NFCIndicator'
import { ProgressBar } from '@/components/ki0xk/ProgressBar'
import { useNfcEvents } from '@/hooks/use-nfc-events'
import { getMode } from '@/lib/mode'
import { DEMO_PIN, WALLET_ID_CHARS, WALLET_ID_LENGTH } from '@/lib/constants'
import {
  apiVerifyAdminPin,
  apiCreateCardWithId,
  apiSetCardPin,
  apiTopUpCard,
  apiGetGatewayBalance,
  apiDepositToGateway,
  apiGetCardSummary,
  apiGetCardInfo,
} from '@/lib/api-client'

type AdminStep =
  | 'pin-entry'
  | 'dashboard'

type TopUpStep =
  | 'enter-amount'
  | 'tap-card'
  | 'new-card-pin'
  | 'processing'
  | 'success'
  | 'error'

type Tab = 'topup' | 'balance' | 'gateway' | 'stats'

const TOPUP_PRESETS = ['0.10', '0.50', '1.00']

function generateWalletId(): string {
  let id = ''
  for (let i = 0; i < WALLET_ID_LENGTH; i++) {
    id += WALLET_ID_CHARS[Math.floor(Math.random() * WALLET_ID_CHARS.length)]
  }
  return id
}

export default function FestivalAdminPage() {
  const isOnlineDemo = getMode() === 'demo_online'

  // Admin auth
  const [adminStep, setAdminStep] = useState<AdminStep>('pin-entry')
  const [adminPin, setAdminPin] = useState('')
  const [adminPinError, setAdminPinError] = useState('')

  // Dashboard
  const [activeTab, setActiveTab] = useState<Tab>('topup')

  // Top-up flow
  const [topUpStep, setTopUpStep] = useState<TopUpStep>('enter-amount')
  const [topUpAmount, setTopUpAmount] = useState('')
  const [cardWalletId, setCardWalletId] = useState('')
  const [newCardPin, setNewCardPin] = useState('')
  const [isNewCard, setIsNewCard] = useState(false)
  const [topUpResult, setTopUpResult] = useState<{ walletId: string; balance: string } | null>(null)
  const [topUpError, setTopUpError] = useState('')

  // Balance check
  const [balanceCheckWaiting, setBalanceCheckWaiting] = useState(true)
  const [checkedCard, setCheckedCard] = useState<{
    walletId: string; balance: string; totalLoaded: string; totalSpent: string
  } | null>(null)
  const [balanceCheckError, setBalanceCheckError] = useState('')

  // Gateway
  const [gatewayBalance, setGatewayBalance] = useState<string | null>(null)
  const [gatewayLoading, setGatewayLoading] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositLoading, setDepositLoading] = useState(false)
  const [depositResult, setDepositResult] = useState('')

  // Online demo: manual wallet ID inputs
  const [manualTopUpWalletId, setManualTopUpWalletId] = useState('')
  const [manualBalanceWalletId, setManualBalanceWalletId] = useState('')

  // Stats
  const [stats, setStats] = useState<any>(null)

  // NFC tap handler — routes to top-up or balance check based on active tab
  const handleNfcTap = useCallback(async (uid: string, data?: { walletId: string }) => {
    const walletId = data?.walletId || uid
    if (!walletId) return

    // Balance check flow
    if (activeTab === 'balance' && balanceCheckWaiting) {
      setBalanceCheckWaiting(false)
      setBalanceCheckError('')
      try {
        const info = await apiGetCardInfo(walletId)
        if (info?.success) {
          setCheckedCard({
            walletId,
            balance: info.balance,
            totalLoaded: info.totalLoaded,
            totalSpent: info.totalSpent,
          })
        } else {
          setBalanceCheckError('Card not found — use Top-Up to create')
        }
      } catch (err) {
        setBalanceCheckError(err instanceof Error ? err.message : 'Card read failed')
      }
      return
    }

    // Top-up flow
    if (topUpStep !== 'tap-card') return

    setCardWalletId(walletId)

    try {
      const info = await apiGetCardInfo(walletId).catch(() => null)

      if (info?.success) {
        setIsNewCard(false)
        setTopUpStep('processing')
        const result = await apiTopUpCard(walletId, topUpAmount)
        if (result.success) {
          setTopUpResult({ walletId, balance: result.newBalance })
          setTopUpStep('success')
        } else {
          setTopUpError(result.message)
          setTopUpStep('error')
        }
      } else {
        setIsNewCard(true)
        await apiCreateCardWithId(walletId)
        setTopUpStep('new-card-pin')
      }
    } catch (err) {
      setTopUpError(err instanceof Error ? err.message : 'Card operation failed')
      setTopUpStep('error')
    }
  }, [topUpStep, topUpAmount, activeTab, balanceCheckWaiting])

  const nfcEnabled = topUpStep === 'tap-card' || (activeTab === 'balance' && balanceCheckWaiting)

  const { connected: nfcConnected } = useNfcEvents({
    onCardTapped: handleNfcTap,
    enabled: nfcEnabled,
  })

  // Admin PIN submit
  const handleAdminPinSubmit = async () => {
    try {
      const result = await apiVerifyAdminPin(adminPin)
      if (result.success) {
        setAdminStep('dashboard')
        setAdminPinError('')
      } else {
        setAdminPinError('Invalid PIN')
        setAdminPin('')
      }
    } catch {
      setAdminPinError('Auth failed')
      setAdminPin('')
    }
  }

  // New card PIN submit
  const handleNewCardPinSubmit = async () => {
    if (newCardPin.length < 4) return
    try {
      await apiSetCardPin(cardWalletId, newCardPin)
      setTopUpStep('processing')
      const result = await apiTopUpCard(cardWalletId, topUpAmount)
      if (result.success) {
        setTopUpResult({ walletId: cardWalletId, balance: result.newBalance })
        setTopUpStep('success')
      } else {
        setTopUpError(result.message)
        setTopUpStep('error')
      }
    } catch (err) {
      setTopUpError(err instanceof Error ? err.message : 'Failed')
      setTopUpStep('error')
    }
  }

  // Gateway
  const fetchGatewayBalance = async () => {
    setGatewayLoading(true)
    try {
      const result = await apiGetGatewayBalance()
      setGatewayBalance(result.available)
    } catch {
      setGatewayBalance('Error')
    }
    setGatewayLoading(false)
  }

  const handleDeposit = async () => {
    if (!depositAmount) return
    setDepositLoading(true)
    setDepositResult('')
    try {
      const result = await apiDepositToGateway(depositAmount)
      if (result.success) {
        setDepositResult(`Deposited! TX: ${result.depositTxHash}`)
        fetchGatewayBalance()
      } else {
        setDepositResult(`Failed: ${result.error}`)
      }
    } catch (err) {
      setDepositResult(err instanceof Error ? err.message : 'Deposit failed')
    }
    setDepositLoading(false)
  }

  // Stats
  const fetchStats = async () => {
    try {
      const result = await apiGetCardSummary()
      setStats(result)
    } catch {}
  }

  const resetTopUp = () => {
    setTopUpStep('enter-amount')
    setTopUpAmount('')
    setCardWalletId('')
    setNewCardPin('')
    setIsNewCard(false)
    setTopUpResult(null)
    setTopUpError('')
    setManualTopUpWalletId('')
  }

  // PIN Entry screen
  if (adminStep === 'pin-entry') {
    return (
      <div className="h-full flex flex-col p-2 gap-1 overflow-hidden">
        {/* iOS-style header: Back | Title | Login */}
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
            Admin Login
          </h1>
          <button
            onClick={handleAdminPinSubmit}
            disabled={adminPin.length < 4}
            className="text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 border"
            style={{ color: adminPin.length >= 4 ? '#ffd700' : '#3a3a5a', borderColor: adminPin.length >= 4 ? '#ffd700' : '#3a3a5a' }}
          >
            Login ›
          </button>
        </div>

        <p className="text-[0.6875rem] uppercase tracking-wider text-center" style={{ color: '#7a7a9a' }}>
          Enter admin PIN to continue
        </p>

        {isOnlineDemo && (
          <p className="text-[0.625rem] uppercase tracking-wider text-center" style={{ color: '#ffd700' }}>
            Demo PIN: {DEMO_PIN}
          </p>
        )}

        <div className="flex-1 flex items-center justify-center min-h-0">
          <NumericKeypad value={adminPin} onChange={setAdminPin} maxLength={6} isPin />
        </div>

        {adminPinError && (
          <p className="text-sm uppercase text-center" style={{ color: '#ef4444' }}>{adminPinError}</p>
        )}
      </div>
    )
  }

  // Dashboard
  return (
    <div className="h-full flex flex-col p-2 gap-1 overflow-hidden">
      {/* iOS-style header: Back | Title | spacer */}
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
          Admin Panel
        </h1>
        <span className="w-12" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {(['topup', 'balance', 'gateway', 'stats'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab)
              if (tab === 'balance') { setBalanceCheckWaiting(true); setCheckedCard(null); setBalanceCheckError('') }
              if (tab === 'gateway') fetchGatewayBalance()
              if (tab === 'stats') fetchStats()
            }}
            className="flex-1 p-1.5 border-2 text-[0.6875rem] uppercase tracking-wider transition-all"
            style={{
              borderColor: activeTab === tab ? '#ffd700' : '#2a2a4a',
              backgroundColor: activeTab === tab ? 'rgba(255, 215, 0, 0.1)' : '#0f0f24',
              color: activeTab === tab ? '#ffd700' : '#7a7a9a',
            }}
          >
            {tab === 'topup' ? 'Top-Up' : tab === 'balance' ? 'Balance' : tab === 'gateway' ? 'Gateway' : 'Stats'}
          </button>
        ))}
      </div>

      {/* TOP-UP TAB */}
      {activeTab === 'topup' && (
        <>
          {topUpStep === 'enter-amount' && (
            <div className="flex flex-col gap-1 flex-1 min-h-0">
              <div className="grid grid-cols-3 gap-1">
                {TOPUP_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setTopUpAmount(preset)}
                    className="p-2 border-2 text-sm transition-all"
                    style={{
                      borderColor: topUpAmount === preset ? '#ffd700' : '#2a2a4a',
                      backgroundColor: topUpAmount === preset ? 'rgba(255, 215, 0, 0.1)' : '#0f0f24',
                      color: topUpAmount === preset ? '#ffd700' : '#e0e8f0',
                    }}
                  >
                    ${preset}
                  </button>
                ))}
              </div>

              <NumericKeypad value={topUpAmount} onChange={setTopUpAmount} maxLength={6} />

              <ArcadeButton
                size="md"
                variant="accent"
                onClick={() => setTopUpStep('tap-card')}
                disabled={!topUpAmount || parseFloat(topUpAmount) <= 0}
                className="w-full"
              >
                {'Tap Card to Load $'}{topUpAmount || '0'}
              </ArcadeButton>
            </div>
          )}

          {topUpStep === 'tap-card' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="text-center space-y-1">
                <h2
                  className="text-sm"
                  style={{ color: '#f093fb', textShadow: '0 0 10px rgba(240, 147, 251, 0.5)' }}
                >
                  {isOnlineDemo ? 'Enter Wallet ID' : 'Tap Card'}
                </h2>
                <p className="text-[0.6875rem] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
                  {isOnlineDemo ? `Enter wallet ID to load $${topUpAmount}` : `Hold card near reader to load $${topUpAmount}`}
                </p>
              </div>
              {isOnlineDemo ? (
                <>
                  <div className="w-full max-w-xs">
                    <input
                      type="text"
                      value={manualTopUpWalletId}
                      onChange={(e) => setManualTopUpWalletId(e.target.value.toUpperCase())}
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
                  <ArcadeButton
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      if (manualTopUpWalletId) handleNfcTap('manual', { walletId: manualTopUpWalletId })
                    }}
                    disabled={!manualTopUpWalletId}
                    className="w-full max-w-xs"
                  >
                    Top Up Existing
                  </ArcadeButton>

                  <div className="w-full max-w-xs border-t-2 pt-2" style={{ borderColor: '#2a2a4a' }}>
                    <p className="text-[0.625rem] uppercase tracking-wider text-center mb-2" style={{ color: '#7a7a9a' }}>
                      Or create a new wallet
                    </p>
                    <ArcadeButton
                      size="sm"
                      variant="accent"
                      onClick={async () => {
                        const wid = generateWalletId()
                        setManualTopUpWalletId(wid)
                        setCardWalletId(wid)
                        setIsNewCard(true)
                        setTopUpStep('processing')
                        try {
                          await apiCreateCardWithId(wid)
                          await apiSetCardPin(wid, DEMO_PIN)
                          const result = await apiTopUpCard(wid, topUpAmount)
                          if (result.success) {
                            setTopUpResult({ walletId: wid, balance: result.newBalance })
                            setTopUpStep('success')
                          } else {
                            setTopUpError(result.message)
                            setTopUpStep('error')
                          }
                        } catch (err) {
                          setTopUpError(err instanceof Error ? err.message : 'Failed')
                          setTopUpStep('error')
                        }
                      }}
                      className="w-full"
                    >
                      Create New Wallet & Load ${topUpAmount}
                    </ArcadeButton>
                    <p className="text-[0.625rem] uppercase text-center mt-1" style={{ color: '#ffd700' }}>
                      PIN will be set to: {DEMO_PIN}
                    </p>
                  </div>
                </>
              ) : (
                <NFCIndicator status="scanning" />
              )}
              <ArcadeButton size="sm" variant="secondary" onClick={resetTopUp}>
                Cancel
              </ArcadeButton>
            </div>
          )}

          {topUpStep === 'new-card-pin' && (
            <div className="flex-1 flex flex-col gap-1 min-h-0">
              <div className="text-center">
                <h2
                  className="text-sm"
                  style={{ color: '#667eea', textShadow: '0 0 10px rgba(102, 126, 234, 0.5)' }}
                >
                  New Card: {cardWalletId}
                </h2>
                <p className="text-[0.6875rem] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
                  Set a PIN for this card
                </p>
              </div>

              <NumericKeypad value={newCardPin} onChange={setNewCardPin} maxLength={6} isPin />

              <ArcadeButton
                size="md"
                variant="primary"
                onClick={handleNewCardPinSubmit}
                disabled={newCardPin.length < 4}
                className="w-full"
              >
                Set PIN & Load
              </ArcadeButton>

              <p className="text-[0.6875rem] uppercase text-center" style={{ color: '#ef4444' }}>
                Remember this PIN — it cannot be recovered
              </p>
            </div>
          )}

          {topUpStep === 'processing' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <h2 className="text-sm" style={{ color: '#667eea' }}>Processing...</h2>
              <div className="w-full max-w-xs">
                <ProgressBar progress={0} isAnimating={true} />
              </div>
            </div>
          )}

          {topUpStep === 'success' && topUpResult && (
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <div
                className="w-12 h-12 flex items-center justify-center"
                style={{
                  border: '3px solid #78ffd6',
                  boxShadow: '0 0 12px rgba(120, 255, 214, 0.4)',
                }}
              >
                <span className="text-xl" style={{ color: '#78ffd6' }}>OK</span>
              </div>

              <div className="text-center space-y-2 w-full max-w-xs">
                <h2 className="text-sm" style={{ color: '#78ffd6' }}>Card Updated</h2>

                <div className="p-2 border-2" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
                  <p className="text-[0.6875rem] uppercase mb-1" style={{ color: '#7a7a9a' }}>Card ID</p>
                  <p className="text-sm" style={{ color: '#667eea' }}>{topUpResult.walletId}</p>
                </div>

                <p className="text-lg" style={{ color: '#ffd700' }}>
                  Balance: ${topUpResult.balance} USDC
                </p>

                {isNewCard && isOnlineDemo && (
                  <div className="p-2 border-2" style={{ backgroundColor: '#0f0f24', borderColor: '#ffd700' }}>
                    <p className="text-[0.6875rem] uppercase mb-1" style={{ color: '#7a7a9a' }}>PIN</p>
                    <p className="text-sm font-mono tracking-[0.3em]" style={{ color: '#ffd700' }}>{DEMO_PIN}</p>
                  </div>
                )}
                {isNewCard && !isOnlineDemo && (
                  <p className="text-[0.6875rem] uppercase" style={{ color: '#ef4444' }}>
                    Remind attendant to REMEMBER their PIN
                  </p>
                )}
              </div>

              <ArcadeButton size="md" variant="primary" onClick={resetTopUp} className="w-full max-w-xs">
                Next Card
              </ArcadeButton>
            </div>
          )}

          {topUpStep === 'error' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <h2 className="text-sm" style={{ color: '#ef4444' }}>Error</h2>
              <p className="text-sm text-center" style={{ color: '#ef4444' }}>{topUpError}</p>
              <ArcadeButton size="md" variant="secondary" onClick={resetTopUp}>
                Try Again
              </ArcadeButton>
            </div>
          )}
        </>
      )}

      {/* BALANCE TAB */}
      {activeTab === 'balance' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          {balanceCheckWaiting && !checkedCard && (
            <>
              <div className="text-center space-y-1">
                <h2
                  className="text-sm"
                  style={{ color: '#667eea', textShadow: '0 0 10px rgba(102, 126, 234, 0.5)' }}
                >
                  Check Balance
                </h2>
                <p className="text-[0.6875rem] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
                  {isOnlineDemo ? 'Enter wallet ID to view balance' : 'Tap a card to view its balance'}
                </p>
              </div>
              {isOnlineDemo ? (
                <>
                  <div className="w-full max-w-xs">
                    <input
                      type="text"
                      value={manualBalanceWalletId}
                      onChange={(e) => setManualBalanceWalletId(e.target.value.toUpperCase())}
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
                  <ArcadeButton
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      if (manualBalanceWalletId) handleNfcTap('manual', { walletId: manualBalanceWalletId })
                    }}
                    disabled={!manualBalanceWalletId}
                    className="w-full max-w-xs"
                  >
                    Check Balance
                  </ArcadeButton>
                </>
              ) : (
                <NFCIndicator status="scanning" />
              )}
            </>
          )}

          {checkedCard && (
            <>
              <div className="text-center space-y-2 w-full max-w-xs">
                <div className="p-2 border-2" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
                  <p className="text-[0.6875rem] uppercase mb-1" style={{ color: '#7a7a9a' }}>Card ID</p>
                  <p className="text-sm" style={{ color: '#667eea' }}>{checkedCard.walletId}</p>
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
                  <p className="text-[0.6875rem] uppercase mb-1" style={{ color: '#7a7a9a' }}>Current Balance</p>
                  <p className="text-xl" style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}>
                    ${checkedCard.balance} <span className="text-xs" style={{ color: '#7a7a9a' }}>USDC</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-1">
                  <div className="p-2 border-2 text-center" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
                    <p className="text-[0.6875rem] uppercase mb-1" style={{ color: '#7a7a9a' }}>Loaded</p>
                    <p className="text-sm" style={{ color: '#78ffd6' }}>${checkedCard.totalLoaded}</p>
                  </div>
                  <div className="p-2 border-2 text-center" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
                    <p className="text-[0.6875rem] uppercase mb-1" style={{ color: '#7a7a9a' }}>Spent</p>
                    <p className="text-sm" style={{ color: '#f093fb' }}>${checkedCard.totalSpent}</p>
                  </div>
                </div>
              </div>

              <ArcadeButton
                size="sm"
                variant="secondary"
                onClick={() => { setBalanceCheckWaiting(true); setCheckedCard(null) }}
                className="w-full max-w-xs"
              >
                Scan Another Card
              </ArcadeButton>
            </>
          )}

          {balanceCheckError && (
            <>
              <p className="text-sm text-center" style={{ color: '#ef4444' }}>{balanceCheckError}</p>
              <ArcadeButton
                size="sm"
                variant="secondary"
                onClick={() => { setBalanceCheckWaiting(true); setBalanceCheckError('') }}
              >
                Try Again
              </ArcadeButton>
            </>
          )}
        </div>
      )}

      {/* GATEWAY TAB */}
      {activeTab === 'gateway' && (
        <div className="flex flex-col gap-2 flex-1">
          <div className="p-2 border-2 text-center" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
            <p className="text-[0.6875rem] uppercase mb-1" style={{ color: '#7a7a9a' }}>Gateway Balance</p>
            <p className="text-xl" style={{ color: '#ffd700' }}>
              {gatewayLoading ? '...' : gatewayBalance !== null ? `$${gatewayBalance}` : '—'}
              <span className="text-xs ml-1" style={{ color: '#7a7a9a' }}>USDC</span>
            </p>
          </div>

          <ArcadeButton size="sm" variant="secondary" onClick={fetchGatewayBalance} className="w-full">
            Refresh Balance
          </ArcadeButton>

          <div className="border-t-2 pt-2" style={{ borderColor: '#2a2a4a' }}>
            <p className="text-[0.6875rem] uppercase mb-1" style={{ color: '#7a7a9a' }}>Deposit to Gateway</p>

            <div className="grid grid-cols-3 gap-1 mb-2">
              {['1', '5', '10'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setDepositAmount(preset)}
                  className="p-2 border-2 text-sm transition-all"
                  style={{
                    borderColor: depositAmount === preset ? '#ffd700' : '#2a2a4a',
                    backgroundColor: depositAmount === preset ? 'rgba(255, 215, 0, 0.1)' : '#0f0f24',
                    color: depositAmount === preset ? '#ffd700' : '#e0e8f0',
                  }}
                >
                  ${preset}
                </button>
              ))}
            </div>

            <ArcadeButton
              size="md"
              variant="accent"
              onClick={handleDeposit}
              disabled={!depositAmount || depositLoading}
              className="w-full"
            >
              {depositLoading ? 'Depositing...' : `Deposit $${depositAmount || '0'}`}
            </ArcadeButton>

            {depositResult && (
              <p
                className="text-[0.6875rem] mt-1 break-all"
                style={{ color: depositResult.startsWith('Failed') ? '#ef4444' : '#78ffd6' }}
              >
                {depositResult}
              </p>
            )}
          </div>
        </div>
      )}

      {/* STATS TAB */}
      {activeTab === 'stats' && (
        <div className="flex flex-col gap-2 flex-1">
          {stats ? (
            <div className="grid grid-cols-2 gap-1">
              <div className="p-2 border-2 text-center" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
                <p className="text-[0.6875rem] uppercase mb-1" style={{ color: '#7a7a9a' }}>Total Cards</p>
                <p className="text-lg" style={{ color: '#667eea' }}>{stats.totalCards}</p>
              </div>
              <div className="p-2 border-2 text-center" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
                <p className="text-[0.6875rem] uppercase mb-1" style={{ color: '#7a7a9a' }}>Total Balance</p>
                <p className="text-lg" style={{ color: '#ffd700' }}>${stats.totalBalance}</p>
              </div>
              <div className="p-2 border-2 text-center" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
                <p className="text-[0.6875rem] uppercase mb-1" style={{ color: '#7a7a9a' }}>Total Loaded</p>
                <p className="text-lg" style={{ color: '#78ffd6' }}>${stats.totalLoaded}</p>
              </div>
              <div className="p-2 border-2 text-center" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
                <p className="text-[0.6875rem] uppercase mb-1" style={{ color: '#7a7a9a' }}>Total Spent</p>
                <p className="text-lg" style={{ color: '#f093fb' }}>${stats.totalSpent}</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[0.6875rem] uppercase" style={{ color: '#7a7a9a' }}>Loading stats...</p>
            </div>
          )}

          <ArcadeButton size="sm" variant="secondary" onClick={fetchStats} className="w-full">
            Refresh
          </ArcadeButton>
        </div>
      )}
    </div>
  )
}
