'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { ArcadeButton } from '@/components/ki0xk/ArcadeButton'
import { NumericKeypad } from '@/components/ki0xk/NumericKeypad'
import { NFCIndicator } from '@/components/ki0xk/NFCIndicator'
import { ProgressBar } from '@/components/ki0xk/ProgressBar'
import { useNfcEvents } from '@/hooks/use-nfc-events'
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

export default function FestivalAdminPage() {
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
  }

  // PIN Entry screen
  if (adminStep === 'pin-entry') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 gap-6">
        <div className="text-center space-y-2">
          <h1
            className="text-lg"
            style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
          >
            Admin Login
          </h1>
          <p className="text-[8px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
            Enter admin PIN to continue
          </p>
        </div>

        <div className="w-full max-w-xs">
          <NumericKeypad value={adminPin} onChange={setAdminPin} maxLength={6} isPin />
        </div>

        {adminPinError && (
          <p className="text-[10px] uppercase" style={{ color: '#ef4444' }}>{adminPinError}</p>
        )}

        <ArcadeButton
          size="md"
          variant="primary"
          onClick={handleAdminPinSubmit}
          disabled={adminPin.length < 4}
          className="w-full max-w-xs"
        >
          Login
        </ArcadeButton>

        <Link href="/app/festival" className="mt-2">
          <span className="text-[8px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>Back</span>
        </Link>
      </div>
    )
  }

  // Dashboard
  return (
    <div className="h-full flex flex-col p-3 gap-3 overflow-hidden">
      {/* Header */}
      <div className="text-center">
        <h1
          className="text-sm"
          style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
        >
          Admin Panel
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['topup', 'balance', 'gateway', 'stats'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab)
              if (tab === 'balance') { setBalanceCheckWaiting(true); setCheckedCard(null); setBalanceCheckError('') }
              if (tab === 'gateway') fetchGatewayBalance()
              if (tab === 'stats') fetchStats()
            }}
            className="flex-1 p-2 border-2 text-[8px] uppercase tracking-wider transition-all"
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
            <div className="flex flex-col gap-3 flex-1">
              <div
                className="p-3 border-2 text-center"
                style={{
                  backgroundColor: '#0f0f24',
                  borderImage: 'linear-gradient(135deg, #78ffd6, #667eea, #ffd700) 1',
                  borderStyle: 'solid',
                  borderWidth: '2px',
                }}
              >
                <p className="text-[8px] uppercase mb-1" style={{ color: '#7a7a9a' }}>Amount to Load</p>
                <p className="text-2xl" style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}>
                  ${topUpAmount || '0'} <span className="text-xs" style={{ color: '#7a7a9a' }}>USDC</span>
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {TOPUP_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setTopUpAmount(preset)}
                    className="p-3 border-2 text-[10px] transition-all"
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

              <div className="flex-1 flex items-center justify-center">
                <NumericKeypad value={topUpAmount} onChange={setTopUpAmount} maxLength={6} />
              </div>

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
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <div className="text-center space-y-2">
                <h2
                  className="text-sm"
                  style={{ color: '#f093fb', textShadow: '0 0 10px rgba(240, 147, 251, 0.5)' }}
                >
                  Tap Card
                </h2>
                <p className="text-[8px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
                  {'Hold attendant\'s card near reader to load $'}{topUpAmount}
                </p>
              </div>
              <NFCIndicator status="scanning" />
              <ArcadeButton size="sm" variant="secondary" onClick={resetTopUp}>
                Cancel
              </ArcadeButton>
            </div>
          )}

          {topUpStep === 'new-card-pin' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="text-center space-y-2">
                <h2
                  className="text-sm"
                  style={{ color: '#667eea', textShadow: '0 0 10px rgba(102, 126, 234, 0.5)' }}
                >
                  New Card: {cardWalletId}
                </h2>
                <p className="text-[8px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
                  Set a PIN for this card
                </p>
              </div>

              <div className="w-full max-w-xs">
                <NumericKeypad value={newCardPin} onChange={setNewCardPin} maxLength={6} isPin />
              </div>

              <ArcadeButton
                size="md"
                variant="primary"
                onClick={handleNewCardPinSubmit}
                disabled={newCardPin.length < 4}
                className="w-full max-w-xs"
              >
                Set PIN & Load
              </ArcadeButton>

              <p className="text-[8px] uppercase text-center" style={{ color: '#ef4444' }}>
                Remember this PIN — it cannot be recovered
              </p>
            </div>
          )}

          {topUpStep === 'processing' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <h2 className="text-sm" style={{ color: '#667eea' }}>Processing...</h2>
              <div className="w-full max-w-xs">
                <ProgressBar progress={0} isAnimating={true} />
              </div>
            </div>
          )}

          {topUpStep === 'success' && topUpResult && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div
                className="w-16 h-16 flex items-center justify-center"
                style={{
                  border: '4px solid #78ffd6',
                  boxShadow: '0 0 12px rgba(120, 255, 214, 0.4)',
                }}
              >
                <span className="text-2xl" style={{ color: '#78ffd6' }}>OK</span>
              </div>

              <div className="text-center space-y-3">
                <h2 className="text-sm" style={{ color: '#78ffd6' }}>Card Updated</h2>

                <div className="p-3 border-2" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
                  <p className="text-[8px] uppercase mb-1" style={{ color: '#7a7a9a' }}>Card ID</p>
                  <p className="text-sm" style={{ color: '#667eea' }}>{topUpResult.walletId}</p>
                </div>

                <p className="text-lg" style={{ color: '#ffd700' }}>
                  Balance: ${topUpResult.balance} USDC
                </p>

                {isNewCard && (
                  <p className="text-[8px] uppercase" style={{ color: '#ef4444' }}>
                    Remind attendant to REMEMBER their PIN
                  </p>
                )}
              </div>

              <ArcadeButton size="md" variant="primary" onClick={resetTopUp} className="w-full max-w-xs mt-2">
                Next Card
              </ArcadeButton>
            </div>
          )}

          {topUpStep === 'error' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <h2 className="text-sm" style={{ color: '#ef4444' }}>Error</h2>
              <p className="text-[10px] text-center" style={{ color: '#ef4444' }}>{topUpError}</p>
              <ArcadeButton size="md" variant="secondary" onClick={resetTopUp}>
                Try Again
              </ArcadeButton>
            </div>
          )}
        </>
      )}

      {/* BALANCE TAB */}
      {activeTab === 'balance' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          {balanceCheckWaiting && !checkedCard && (
            <>
              <div className="text-center space-y-2">
                <h2
                  className="text-sm"
                  style={{ color: '#667eea', textShadow: '0 0 10px rgba(102, 126, 234, 0.5)' }}
                >
                  Check Balance
                </h2>
                <p className="text-[8px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
                  Tap a card to view its balance
                </p>
              </div>
              <NFCIndicator status="scanning" />
            </>
          )}

          {checkedCard && (
            <>
              <div
                className="w-16 h-16 flex items-center justify-center"
                style={{
                  border: '4px solid #667eea',
                  boxShadow: '0 0 12px rgba(102, 126, 234, 0.4)',
                }}
              >
                <span className="text-lg" style={{ color: '#667eea' }}>$</span>
              </div>

              <div className="text-center space-y-3 w-full max-w-xs">
                <div className="p-3 border-2" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
                  <p className="text-[8px] uppercase mb-1" style={{ color: '#7a7a9a' }}>Card ID</p>
                  <p className="text-sm" style={{ color: '#667eea' }}>{checkedCard.walletId}</p>
                </div>

                <div
                  className="p-4 border-2 text-center"
                  style={{
                    backgroundColor: '#0f0f24',
                    borderImage: 'linear-gradient(135deg, #78ffd6, #667eea, #ffd700) 1',
                    borderStyle: 'solid',
                    borderWidth: '2px',
                  }}
                >
                  <p className="text-[8px] uppercase mb-1" style={{ color: '#7a7a9a' }}>Current Balance</p>
                  <p className="text-2xl" style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}>
                    ${checkedCard.balance} <span className="text-xs" style={{ color: '#7a7a9a' }}>USDC</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 border-2 text-center" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
                    <p className="text-[8px] uppercase mb-1" style={{ color: '#7a7a9a' }}>Loaded</p>
                    <p className="text-sm" style={{ color: '#78ffd6' }}>${checkedCard.totalLoaded}</p>
                  </div>
                  <div className="p-2 border-2 text-center" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
                    <p className="text-[8px] uppercase mb-1" style={{ color: '#7a7a9a' }}>Spent</p>
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
              <p className="text-[10px] text-center" style={{ color: '#ef4444' }}>{balanceCheckError}</p>
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
        <div className="flex flex-col gap-3 flex-1">
          <div className="p-3 border-2 text-center" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
            <p className="text-[8px] uppercase mb-1" style={{ color: '#7a7a9a' }}>Gateway Balance</p>
            <p className="text-xl" style={{ color: '#ffd700' }}>
              {gatewayLoading ? '...' : gatewayBalance !== null ? `$${gatewayBalance}` : '—'}
              <span className="text-xs ml-1" style={{ color: '#7a7a9a' }}>USDC</span>
            </p>
          </div>

          <ArcadeButton size="sm" variant="secondary" onClick={fetchGatewayBalance} className="w-full">
            Refresh Balance
          </ArcadeButton>

          <div className="border-t-2 pt-3 mt-2" style={{ borderColor: '#2a2a4a' }}>
            <p className="text-[8px] uppercase mb-2" style={{ color: '#7a7a9a' }}>Deposit to Gateway</p>

            <div className="grid grid-cols-3 gap-2 mb-3">
              {['1', '5', '10'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setDepositAmount(preset)}
                  className="p-2 border-2 text-[10px] transition-all"
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
                className="text-[8px] mt-2 break-all"
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
        <div className="flex flex-col gap-3 flex-1">
          {stats ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 border-2 text-center" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
                  <p className="text-[8px] uppercase mb-1" style={{ color: '#7a7a9a' }}>Total Cards</p>
                  <p className="text-lg" style={{ color: '#667eea' }}>{stats.totalCards}</p>
                </div>
                <div className="p-3 border-2 text-center" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
                  <p className="text-[8px] uppercase mb-1" style={{ color: '#7a7a9a' }}>Total Balance</p>
                  <p className="text-lg" style={{ color: '#ffd700' }}>${stats.totalBalance}</p>
                </div>
                <div className="p-3 border-2 text-center" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
                  <p className="text-[8px] uppercase mb-1" style={{ color: '#7a7a9a' }}>Total Loaded</p>
                  <p className="text-lg" style={{ color: '#78ffd6' }}>${stats.totalLoaded}</p>
                </div>
                <div className="p-3 border-2 text-center" style={{ backgroundColor: '#0f0f24', borderColor: '#2a2a4a' }}>
                  <p className="text-[8px] uppercase mb-1" style={{ color: '#7a7a9a' }}>Total Spent</p>
                  <p className="text-lg" style={{ color: '#f093fb' }}>${stats.totalSpent}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[8px] uppercase" style={{ color: '#7a7a9a' }}>Loading stats...</p>
            </div>
          )}

          <ArcadeButton size="sm" variant="secondary" onClick={fetchStats} className="w-full">
            Refresh
          </ArcadeButton>
        </div>
      )}

      {/* Back link */}
      <Link href="/app/festival" className="text-center mt-1">
        <span className="text-[8px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>Back</span>
      </Link>
    </div>
  )
}
