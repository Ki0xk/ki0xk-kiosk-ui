'use client'

import { useEffect, useRef, useState } from 'react'
import { getModeFeatures } from '@/lib/mode'

interface NfcTapEvent {
  id: string
  type: 'nfc_tap'
  uid: string
  data?: { walletId: string }
  timestamp: number
}

interface UseNfcEventsOptions {
  onCardTapped?: (uid: string, data?: { walletId: string }) => void
  enabled?: boolean
}

export function useNfcEvents({ onCardTapped, enabled = true }: UseNfcEventsOptions = {}) {
  const [connected, setConnected] = useState(false)
  const seenIds = useRef(new Set<string>())
  const callbackRef = useRef(onCardTapped)
  callbackRef.current = onCardTapped

  const features = getModeFeatures()

  useEffect(() => {
    if (!features.useRealNFC || !enabled) return

    const eventSource = new EventSource('/api/hardware/nfc/events')

    eventSource.onopen = () => setConnected(true)
    eventSource.onerror = () => setConnected(false)

    eventSource.onmessage = (e) => {
      try {
        const event: NfcTapEvent = JSON.parse(e.data)
        if (seenIds.current.has(event.id)) return
        seenIds.current.add(event.id)

        if (callbackRef.current) {
          callbackRef.current(event.uid, event.data)
        }
      } catch {}
    }

    return () => {
      eventSource.close()
      setConnected(false)
    }
  }, [features.useRealNFC, enabled])

  return { connected }
}
