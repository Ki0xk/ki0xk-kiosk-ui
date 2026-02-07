'use client'

import React, { useEffect, useState } from "react"
import { Ki0xkProvider } from '@/lib/state'
import { PixelFrame } from '@/components/ki0xk/PixelFrame'
import { getMode, getModeFeatures } from '@/lib/mode'
import { useSerialStatus } from '@/hooks/use-serial-status'

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
        className="text-[8px] uppercase tracking-wider"
        style={{ color: connected ? '#78ffd6' : '#ef4444' }}
      >
        {connected ? 'Arduino OK' : 'No Arduino'}
      </span>
    </div>
  )
}

function NfcAutoConnect() {
  const features = getModeFeatures()
  const [nfcConnected, setNfcConnected] = useState(false)
  const [attempted, setAttempted] = useState(false)

  useEffect(() => {
    if (!features.useRealNFC) return

    // Initial connect call
    if (!attempted) {
      setAttempted(true)
      fetch('/api/hardware/nfc/connect', { method: 'POST' })
        .then((res) => res.json())
        .then((data) => { if (data.readerReady) setNfcConnected(true) })
        .catch(() => {})
    }

    // Poll /api/hardware/status for actual reader state
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/hardware/status')
        const data = await res.json()
        setNfcConnected(data.nfc?.connected ?? false)
      } catch {}
    }, 5000)

    return () => clearInterval(interval)
  }, [features.useRealNFC, attempted])

  if (!features.useRealNFC) return null

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-2 h-2 animate-pulse"
        style={{ backgroundColor: nfcConnected ? '#78ffd6' : '#ef4444' }}
      />
      <span
        className="text-[8px] uppercase tracking-wider"
        style={{ color: nfcConnected ? '#78ffd6' : '#ef4444' }}
      >
        {nfcConnected ? 'NFC OK' : 'No NFC'}
      </span>
    </div>
  )
}

function StatusIndicator() {
  const mode = getMode()
  const features = getModeFeatures()

  if (features.useRealNFC) {
    // Festival mode: show both Arduino + NFC
    return (
      <div className="flex items-center gap-3">
        <SerialAutoConnect />
        <NfcAutoConnect />
      </div>
    )
  }

  if (features.serialEnabled) {
    return <SerialAutoConnect />
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 animate-pulse" style={{ backgroundColor: '#78ffd6' }} />
      <span className="text-[8px] uppercase tracking-wider" style={{ color: '#78ffd6' }}>
        System Online
      </span>
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
    <span className="text-[7px] uppercase tracking-widest" style={{ color: '#7a7a9a' }}>
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

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Ki0xkProvider>
      <AutoFundOnStartup />
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-2xl aspect-[3/4] max-h-[90vh]">
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
                    className="text-[8px] uppercase tracking-wider"
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
