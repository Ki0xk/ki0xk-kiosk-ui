'use client'

import React from "react"
import { Ki0xkProvider } from '@/lib/state'
import { PixelFrame } from '@/components/ki0xk/PixelFrame'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Ki0xkProvider>
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
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 animate-pulse" style={{ backgroundColor: '#78ffd6' }} />
                  <span className="text-[8px] uppercase tracking-wider" style={{ color: '#78ffd6' }}>
                    System Online
                  </span>
                </div>
                <span
                  className="text-[8px] uppercase tracking-wider"
                  style={{ color: '#ffd700', textShadow: '0 0 6px rgba(255, 215, 0, 0.4)' }}
                >
                  Ki0xk
                </span>
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
