'use client'

import { useEffect, useRef, useState } from 'react'
import { getMode, getModeFeatures } from '@/lib/mode'

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
 * NFC hook with two strategies:
 * 1. PC/SC via SSE (server-side USB reader — kiosk/festival mode)
 * 2. Web NFC API (phone's built-in NFC — online demo mode only)
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
  const mode = getMode()

  // ---- Strategy 1: PC/SC via SSE (USB NFC reader, kiosk/festival mode) ----
  useEffect(() => {
    if (!features.useRealNFC) return

    let active = true
    let eventSource: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    function connect() {
      if (!active) return
      eventSource = new EventSource('/api/hardware/nfc/events')

      eventSource.onopen = () => {
        if (!active) return
        setConnected(true)
        setSource('pcsc')
      }

      eventSource.onerror = () => {
        if (!active) return
        setConnected(false)
        // EventSource auto-reconnects for most errors, but if it closes
        // permanently (readyState === CLOSED), reconnect manually
        if (eventSource?.readyState === EventSource.CLOSED) {
          reconnectTimer = setTimeout(connect, 2000)
        }
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
    }

    connect()

    return () => {
      active = false
      eventSource?.close()
      if (reconnectTimer) clearTimeout(reconnectTimer)
      setConnected(false)
    }
  }, [features.useRealNFC])

  // ---- Strategy 2: Web NFC API (phone NFC — online demo mode ONLY) ----
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('NDEFReader' in window)) return
    // Only use Web NFC in online demo mode (no USB hardware)
    if (mode !== 'demo_online') return
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
    }, 500)

    return () => clearTimeout(timer)
  }, [mode, source])

  return { connected, source }
}
