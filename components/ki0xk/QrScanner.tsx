'use client'

import { useEffect, useRef, useState } from 'react'
import { ArcadeButton } from './ArcadeButton'

interface QrScannerProps {
  onScan: (address: string) => void
  onError?: (error: string) => void
  onClose: () => void
}

export function QrScanner({ onScan, onError, onClose }: QrScannerProps) {
  const [status, setStatus] = useState<'loading' | 'scanning' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const scannerRef = useRef<unknown>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let html5QrCode: { stop: () => Promise<void>; start: (...args: unknown[]) => Promise<void> } | null = null

    const startScanner = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const { Html5Qrcode } = await import('html5-qrcode')

        html5QrCode = new Html5Qrcode('qr-reader-container')
        scannerRef.current = html5QrCode

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 200, height: 200 },
          },
          (decodedText: string) => {
            // Validate: Ethereum address (0x + 40 hex) or ENS name (contains .)
            const isEthAddress = /^0x[a-fA-F0-9]{40}$/.test(decodedText)
            const isEns = /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/.test(decodedText)

            if (isEthAddress || isEns) {
              onScan(decodedText)
              // Stop scanner after successful scan
              html5QrCode?.stop().catch(() => {})
            }
          },
          () => {
            // QR code not found in frame — this is normal, just keep scanning
          },
        )

        setStatus('scanning')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Camera access denied'
        setErrorMsg(msg)
        setStatus('error')
        onError?.(msg)
      }
    }

    startScanner()

    return () => {
      const scanner = scannerRef.current as { stop: () => Promise<void> } | null
      scanner?.stop().catch(() => {})
    }
  }, [onScan, onError])

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {/* Camera preview area */}
      <div
        className="relative w-full aspect-square max-w-[280px] overflow-hidden"
        ref={containerRef}
        style={{
          backgroundColor: '#0a0a1a',
          border: '3px solid transparent',
          borderImage: 'linear-gradient(135deg, #78ffd6, #667eea, #764ba2, #f093fb, #ffd700) 1',
        }}
      >
        {/* Scanner container */}
        <div id="qr-reader-container" className="w-full h-full" />

        {/* Corner brackets overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Top-left */}
          <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2" style={{ borderColor: '#78ffd6' }} />
          {/* Top-right */}
          <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2" style={{ borderColor: '#667eea' }} />
          {/* Bottom-left */}
          <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2" style={{ borderColor: '#f093fb' }} />
          {/* Bottom-right */}
          <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2" style={{ borderColor: '#ffd700' }} />
        </div>

        {/* Loading state */}
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: '#0a0a1aee' }}>
            <div className="text-center">
              <div
                className="w-8 h-8 mx-auto mb-2 animate-spin"
                style={{ border: '2px solid #2a2a4a', borderTopColor: '#667eea' }}
              />
              <p className="text-[8px] uppercase tracking-widest" style={{ color: '#7a7a9a' }}>
                Starting camera...
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: '#0a0a1aee' }}>
            <div className="text-center p-4">
              <p className="text-[10px] uppercase mb-2" style={{ color: '#ef4444' }}>
                Camera Error
              </p>
              <p className="text-[8px] mb-3" style={{ color: '#7a7a9a' }}>
                {errorMsg || 'Could not access camera'}
              </p>
              <p className="text-[7px]" style={{ color: '#7a7a9a' }}>
                Try ENS input instead
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Status label */}
      {status === 'scanning' && (
        <p className="text-[8px] uppercase tracking-widest" style={{ color: '#78ffd6' }}>
          Point camera at QR code
        </p>
      )}

      {/* Back button */}
      <ArcadeButton variant="secondary" size="sm" onClick={onClose}>
        Back
      </ArcadeButton>
    </div>
  )
}
