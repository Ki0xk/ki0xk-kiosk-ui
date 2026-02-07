'use client'

import React, { useEffect, useState } from "react"
import { Ki0xkProvider } from '@/lib/state'
import { PixelFrame } from '@/components/ki0xk/PixelFrame'
import { getMode, getModeFeatures } from '@/lib/mode'
import { useSerialStatus } from '@/hooks/use-serial-status'
import { useNfcEvents } from '@/hooks/use-nfc-events'

function SerialAutoConnect() {
  const features = getModeFeatures()
  const { connected } = useSerialStatus()
  const [attempted, setAttempted] = useState(false)

  useEffect(() => {
    if (!features.serialEnabled || attempted) return
    setAttempted(true)
    fetch('/api/hardware/coin/connect', { method: 'POST' }).catch(() => {})
  }, [features.serialEnabled, attempted])

  if (!features.serialEnabled) return null

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-2 h-2 animate-pulse"
        style={{ backgroundColor: connected ? '#78ffd6' : '#ef4444' }}
      />
      <span
        className="text-[11px] uppercase tracking-wider"
        style={{ color: connected ? '#78ffd6' : '#ef4444' }}
      >
        {connected ? 'Arduino OK' : 'No Arduino'}
      </span>
    </div>
  )
}

function NfcStatus() {
  const features = getModeFeatures()
  const [attempted, setAttempted] = useState(false)
  const { connected, source } = useNfcEvents({})

  useEffect(() => {
    // Only attempt PC/SC connect in festival mode
    if (!features.useRealNFC || attempted) return
    setAttempted(true)
    fetch('/api/hardware/nfc/connect', { method: 'POST' }).catch(() => {})
  }, [features.useRealNFC, attempted])

  // Show nothing if no NFC source detected
  if (!connected) return null

  const label = source === 'webnfc' ? 'Phone NFC' : 'NFC OK'

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-2 h-2 animate-pulse"
        style={{ backgroundColor: '#78ffd6' }}
      />
      <span
        className="text-[11px] uppercase tracking-wider"
        style={{ color: '#78ffd6' }}
      >
        {label}
      </span>
    </div>
  )
}

function StatusIndicator() {
  const features = getModeFeatures()

  return (
    <div className="flex items-center gap-3">
      {features.serialEnabled && <SerialAutoConnect />}
      <NfcStatus />
      {!features.serialEnabled && (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 animate-pulse" style={{ backgroundColor: '#78ffd6' }} />
          <span className="text-[11px] uppercase tracking-wider" style={{ color: '#78ffd6' }}>
            Online
          </span>
        </div>
      )}
    </div>
  )
}

function ModeLabel() {
  const mode = getMode()
  const labels: Record<string, string> = {
    demo_online: 'Online',
    demo_kiosk: 'Kiosk',
    demo_festival: 'Festival',
  }
  return (
    <span className="text-[10px] uppercase tracking-widest" style={{ color: '#7a7a9a' }}>
      {labels[mode] || 'Online'}
    </span>
  )
}

function AutoFundOnStartup() {
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (done) return
    setDone(true)
    // Trigger /api/status once on mount — this runs autoFundIfNeeded() server-side
    fetch('/api/status').catch(() => {})
  }, [done])
  return null
}

function useAutoZoom() {
  // Auto-scale UI to fill viewport. Design baseline: 800x500 effective px.
  // NEXT_PUBLIC_ZOOM overrides auto-zoom if set (e.g. "1.5" or "auto" for default)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    const envZoom = process.env.NEXT_PUBLIC_ZOOM
    // If a fixed number is set, use it
    if (envZoom && envZoom !== 'auto' && !isNaN(Number(envZoom))) {
      setZoom(Number(envZoom))
      return
    }

    function update() {
      const vw = window.innerWidth
      const vh = window.innerHeight
      // Scale to fill viewport based on design baseline
      const scale = Math.min(vw / 800, vh / 500)
      setZoom(Math.max(1, Math.min(scale, 3)))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return zoom
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const zoom = useAutoZoom()

  return (
    <Ki0xkProvider>
      <AutoFundOnStartup />
      <div className="h-screen bg-background flex items-center justify-center">
        <div
          className="w-full h-full max-h-screen"
          style={{ zoom }}
        >
          <PixelFrame>
            <div className="flex flex-col h-full">
              {/* Header */}
              <header
                className="flex items-center justify-between px-4 py-3 border-b-2"
                style={{
                  borderColor: '#2a2a4a',
                  backgroundColor: 'rgba(15, 15, 36, 0.6)',
                }}
              >
                <StatusIndicator />
                <div className="flex items-center gap-3">
                  <ModeLabel />
                  <span
                    className="text-[11px] uppercase tracking-wider"
                    style={{ color: '#ffd700', textShadow: '0 0 6px rgba(255, 215, 0, 0.4)' }}
                  >
                    Ki0xk
                  </span>
                </div>
              </header>

              {/* Main content */}
              <main className="flex-1 overflow-hidden">
                {children}
              </main>

              {/* Footer */}
              <footer
                className="px-4 py-3 border-t-2"
                style={{
                  borderColor: '#2a2a4a',
                  backgroundColor: 'rgba(15, 15, 36, 0.6)',
                }}
              >
                <div className="flex items-center justify-center gap-2">
                  {['#78ffd6', '#667eea', '#764ba2', '#f093fb', '#ffd700'].map((color, i) => (
                    <div key={i} className="w-1.5 h-1.5" style={{ backgroundColor: color, opacity: 0.5 }} />
                  ))}
                </div>
              </footer>
            </div>
          </PixelFrame>
        </div>
      </div>
    </Ki0xkProvider>
  )
}
