'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { getModeFeatures } from '@/lib/mode'
import { COIN_DENOMINATIONS } from '@/lib/constants'

interface CoinEvent {
  id: string
  type: 'coin'
  pulses: number
  value: number
  ok: boolean
  timestamp: number
}

interface UseCoinEventsOptions {
  onCoinInserted?: (pesos: number, usdc: number) => void
}

export function useCoinEvents({ onCoinInserted }: UseCoinEventsOptions = {}) {
  const [connected, setConnected] = useState(false)
  const seenIds = useRef(new Set<string>())
  const callbackRef = useRef(onCoinInserted)
  callbackRef.current = onCoinInserted

  const features = getModeFeatures()

  useEffect(() => {
    if (!features.useArduinoSerial) return

    const eventSource = new EventSource('/api/hardware/coin/events')

    eventSource.onopen = () => setConnected(true)
    eventSource.onerror = () => setConnected(false)

    eventSource.onmessage = (e) => {
      try {
        const event: CoinEvent = JSON.parse(e.data)
        if (seenIds.current.has(event.id)) return
        seenIds.current.add(event.id)

        // Map Arduino value (pesos) to USDC
        const denom = COIN_DENOMINATIONS.find((d) => d.pesos === event.value)
        if (denom && callbackRef.current) {
          callbackRef.current(denom.pesos, denom.usdc)
        }
      } catch {}
    }

    return () => {
      eventSource.close()
      setConnected(false)
    }
  }, [features.useArduinoSerial])

  return { connected }
}
