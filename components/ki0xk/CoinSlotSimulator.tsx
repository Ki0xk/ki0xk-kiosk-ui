'use client'

import { useState } from 'react'
import { COIN_DENOMINATIONS } from '@/lib/constants'
import { simulateCoinInsert } from '@/lib/mock'
import { getModeFeatures } from '@/lib/mode'
import { useCoinEvents } from '@/hooks/use-coin-events'
import { CoinAnimation } from './CoinAnimation'

interface CoinSlotSimulatorProps {
  onCoinInserted: (pesos: number, usdc: number) => void
  totalPesos: number
  totalUSDC: number
  disabled?: boolean
}

const coinColors = [
  { bg: '#cd7f32', glow: 'rgba(205, 127, 50, 0.4)' },  // 1 peso — bronze
  { bg: '#c0c0c0', glow: 'rgba(192, 192, 192, 0.4)' },  // 2 pesos — silver
  { bg: '#ffd700', glow: 'rgba(255, 215, 0, 0.4)' },     // 5 pesos — gold
]

export function CoinSlotSimulator({ onCoinInserted, totalPesos, totalUSDC, disabled }: CoinSlotSimulatorProps) {
  const [lastEvent, setLastEvent] = useState<string | null>(null)
  const [animatingCoin, setAnimatingCoin] = useState<number | null>(null)

  const features = getModeFeatures()

  // For Arduino modes, subscribe to SSE coin events
  const { connected: arduinoConnected } = useCoinEvents({
    onCoinInserted: features.useArduinoSerial ? (pesos, usdc) => {
      // Find the denomination index for animation
      const idx = COIN_DENOMINATIONS.findIndex((d) => d.pesos === pesos)
      if (idx >= 0) {
        setLastEvent(JSON.stringify({ type: 'coin', value: pesos, ok: true }))
        setAnimatingCoin(idx)
        setTimeout(() => setAnimatingCoin(null), 800)
      }
      onCoinInserted(pesos, usdc)
    } : undefined,
  })

  const handleCoinTap = (index: 0 | 1 | 2) => {
    if (disabled || !features.useSimulatedCoins) return
    const coin = COIN_DENOMINATIONS[index]
    const event = simulateCoinInsert(index)

    setLastEvent(JSON.stringify(event))
    setAnimatingCoin(index)
    onCoinInserted(coin.pesos, coin.usdc)

    setTimeout(() => setAnimatingCoin(null), 800)
  }

  // Arduino serial mode — show waiting indicator instead of coin buttons
  if (features.useArduinoSerial) {
    return (
      <div className="w-full">
        {/* Running total */}
        <div
          className="mb-4 p-3 border-2 text-center"
          style={{
            backgroundColor: '#0f0f24',
            borderColor: '#667eea',
            boxShadow: 'inset 2px 2px 0px 0px rgba(0,0,0,0.3), 0 0 8px rgba(102, 126, 234, 0.2)',
          }}
        >
          <p className="text-[8px] uppercase tracking-widest mb-1" style={{ color: '#7a7a9a' }}>
            Total Inserted
          </p>
          <p className="text-lg" style={{ color: '#ffd700', textShadow: '0 0 8px rgba(255, 215, 0, 0.4)' }}>
            {totalPesos} Pesos = ${totalUSDC.toFixed(2)} USDC
          </p>
        </div>

        {/* Arduino status + waiting indicator */}
        <div
          className="p-6 border-2 text-center"
          style={{
            backgroundColor: '#0f0f24',
            borderColor: arduinoConnected ? '#78ffd6' : '#ef4444',
            boxShadow: arduinoConnected
              ? '0 0 12px rgba(120, 255, 214, 0.2)'
              : '0 0 12px rgba(239, 68, 68, 0.2)',
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <div
              className="w-2 h-2 animate-pulse"
              style={{ backgroundColor: arduinoConnected ? '#78ffd6' : '#ef4444' }}
            />
            <span
              className="text-[8px] uppercase tracking-widest"
              style={{ color: arduinoConnected ? '#78ffd6' : '#ef4444' }}
            >
              {arduinoConnected ? 'Arduino Connected' : 'Arduino Disconnected'}
            </span>
          </div>
          <p
            className="text-sm uppercase tracking-wider"
            style={{
              color: '#ffd700',
              textShadow: '0 0 8px rgba(255, 215, 0, 0.4)',
            }}
          >
            INSERT COIN
          </p>
          <p className="text-[7px] uppercase tracking-widest mt-2" style={{ color: '#7a7a9a' }}>
            Waiting for physical coin...
          </p>
        </div>

        {/* Arduino JSON output */}
        {lastEvent && (
          <div
            className="mt-4 p-2 border text-center"
            style={{ backgroundColor: '#0a0a1a', borderColor: '#2a2a4a' }}
          >
            <p className="text-[7px] font-mono" style={{ color: '#78ffd6' }}>
              {lastEvent}
            </p>
          </div>
        )}

        <CoinAnimation
          isAnimating={animatingCoin !== null}
          amount={animatingCoin !== null ? COIN_DENOMINATIONS[animatingCoin].usdc : 0}
        />
      </div>
    )
  }

  // Simulated coin mode (demo_online)
  return (
    <div className="w-full">
      {/* Running total */}
      <div
        className="mb-4 p-3 border-2 text-center"
        style={{
          backgroundColor: '#0f0f24',
          borderColor: '#667eea',
          boxShadow: 'inset 2px 2px 0px 0px rgba(0,0,0,0.3), 0 0 8px rgba(102, 126, 234, 0.2)',
        }}
      >
        <p className="text-[8px] uppercase tracking-widest mb-1" style={{ color: '#7a7a9a' }}>
          Total Inserted
        </p>
        <p className="text-lg" style={{ color: '#ffd700', textShadow: '0 0 8px rgba(255, 215, 0, 0.4)' }}>
          {totalPesos} Pesos = ${totalUSDC.toFixed(2)} USDC
        </p>
      </div>

      {/* Coin buttons */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {COIN_DENOMINATIONS.map((coin, i) => (
          <button
            key={coin.pesos}
            onClick={() => handleCoinTap(i as 0 | 1 | 2)}
            disabled={disabled}
            className="flex flex-col items-center gap-2 p-3 transition-all duration-100 touch-active"
            style={{
              backgroundColor: '#0f0f24',
              border: `2px solid ${coinColors[i].bg}`,
              opacity: disabled ? 0.4 : 1,
              boxShadow: `
                inset -2px -2px 0px 0px rgba(0,0,0,0.3),
                inset 2px 2px 0px 0px rgba(255,255,255,0.05),
                0 0 12px ${coinColors[i].glow}
              `,
            }}
          >
            {/* Coin icon */}
            <div
              className="w-12 h-12 flex items-center justify-center text-[10px] font-bold"
              style={{
                background: `linear-gradient(135deg, ${coinColors[i].bg}, ${coinColors[i].bg}dd)`,
                color: '#0a0a1a',
                boxShadow: `0 0 8px ${coinColors[i].glow}`,
              }}
            >
              ${coin.pesos}
            </div>
            <span className="text-[8px] uppercase" style={{ color: '#e0e8f0' }}>
              {coin.label}
            </span>
            <span className="text-[7px]" style={{ color: '#78ffd6' }}>
              ${coin.usdc.toFixed(2)} USDC
            </span>
          </button>
        ))}
      </div>

      {/* Arduino JSON output simulation */}
      {lastEvent && (
        <div
          className="p-2 border text-center"
          style={{
            backgroundColor: '#0a0a1a',
            borderColor: '#2a2a4a',
          }}
        >
          <p className="text-[7px] font-mono" style={{ color: '#78ffd6' }}>
            {lastEvent}
          </p>
        </div>
      )}

      {/* Coin drop animation */}
      <CoinAnimation
        isAnimating={animatingCoin !== null}
        amount={animatingCoin !== null ? COIN_DENOMINATIONS[animatingCoin].usdc : 0}
      />
    </div>
  )
}
