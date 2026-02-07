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

type NfcSource = 'none' | 'pcsc' | 'webnfc'

/**
 * NFC hook with automatic fallback:
 * 1. PC/SC via SSE (server-side USB reader — festival/kiosk mode only)
 * 2. Web NFC API (phone's built-in NFC — works in all modes on Android Chrome)
 */
export function useNfcEvents({ onCardTapped, enabled = true }: UseNfcEventsOptions = {}) {
  const [connected, setConnected] = useState(false)
  const [source, setSource] = useState<NfcSource>('none')
  const seenIds = useRef(new Set<string>())
  const callbackRef = useRef(onCardTapped)
  callbackRef.current = onCardTapped
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  const features = getModeFeatures()

  // ---- Strategy 1: PC/SC via SSE (USB NFC reader, festival mode only) ----
  useEffect(() => {
    if (!features.useRealNFC) return

    let sseConnected = false
    const eventSource = new EventSource('/api/hardware/nfc/events')

    eventSource.onopen = () => {
      sseConnected = true
      setConnected(true)
      setSource('pcsc')
    }
    eventSource.onerror = () => {
      sseConnected = false
      setConnected(false)
    }

    eventSource.onmessage = (e) => {
      try {
        const event: NfcTapEvent = JSON.parse(e.data)
        if (seenIds.current.has(event.id)) return
        seenIds.current.add(event.id)

        if (enabledRef.current && callbackRef.current) {
          callbackRef.current(event.uid, event.data)
        }
      } catch {}
    }

    return () => {
      eventSource.close()
      if (sseConnected) setConnected(false)
    }
  }, [features.useRealNFC])

  // ---- Strategy 2: Web NFC API (phone's built-in NFC — all modes) ----
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('NDEFReader' in window)) return
    // Skip if PC/SC already connected
    if (source === 'pcsc') return

    const timer = setTimeout(async () => {
      if (source === 'pcsc') return
      try {
        const NDEFReader = (window as any).NDEFReader
        const reader = new NDEFReader()
        await reader.scan()

        setConnected(true)
        setSource('webnfc')

        reader.onreading = (event: any) => {
          const rawUid: string = event.serialNumber || ''
          const uid = rawUid.replace(/:/g, '').toUpperCase()
          if (!uid) return

          const eventId = `webnfc_${uid}_${Date.now()}`
          if (seenIds.current.has(eventId)) return
          seenIds.current.add(eventId)

          if (enabledRef.current && callbackRef.current) {
            callbackRef.current(uid, { walletId: uid })
          }
        }

        reader.onreadingerror = () => {}
      } catch (err) {
        console.warn('Web NFC not available:', err)
      }
    }, features.useRealNFC ? 3000 : 500)

    return () => clearTimeout(timer)
  }, [features.useRealNFC, source])

  return { connected, source }
}
