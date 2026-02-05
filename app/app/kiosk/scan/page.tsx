'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArcadeButton } from '@/components/ki0xk/ArcadeButton'
import { NFCIndicator } from '@/components/ki0xk/NFCIndicator'
import { PixelFrame } from '@/components/ki0xk/PixelFrame'
import { useKi0xk, actions } from '@/lib/state'
import Link from 'next/link'

type AuthMethod = 'select' | 'ens' | 'nfc' | 'qr'

export default function ScanPage() {
  const router = useRouter()
  const { dispatch } = useKi0xk()
  const [method, setMethod] = useState<AuthMethod>('select')
  const [ensInput, setEnsInput] = useState('')
  const [nfcStatus, setNfcStatus] = useState<'ready' | 'scanning' | 'success' | 'error'>('ready')
  const [qrScanning, setQrScanning] = useState(false)
  const [error, setError] = useState('')

  const loadWallet = (ensName: string) => {
    const mockWallet = {
      ensName,
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38',
      balance: 25.50
    }
    dispatch(actions.startSession(mockWallet.ensName, mockWallet.address))
    dispatch(actions.setBalance(mockWallet.balance))
  }

  const handleEnsSubmit = async () => {
    if (!ensInput.trim()) {
      setError('Please enter an ENS name')
      return
    }
    setError('')
    await new Promise(resolve => setTimeout(resolve, 1000))
    const fullEns = ensInput.includes('.') ? ensInput : `${ensInput}.ki0xk.eth`
    loadWallet(fullEns)
    router.push('/app/kiosk/wallet')
  }

  const handleNfcTap = async () => {
    setNfcStatus('scanning')
    await new Promise(resolve => setTimeout(resolve, 2000))
    setNfcStatus('success')
    loadWallet('player42.ki0xk.eth')
    await new Promise(resolve => setTimeout(resolve, 800))
    router.push('/app/kiosk/wallet')
  }

  const handleQrScan = async () => {
    setQrScanning(true)
    await new Promise(resolve => setTimeout(resolve, 2500))
    loadWallet('qruser.ki0xk.eth')
    router.push('/app/kiosk/wallet')
  }

  // Method selection
  if (method === 'select') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 gap-6">
        <div className="text-center space-y-2">
          <h1
            className="text-lg"
            style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
          >
            Access Wallet
          </h1>
          <p className="text-[8px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
            Choose how to identify yourself
          </p>
        </div>

        <div className="w-full max-w-xs space-y-4 mt-4">
          <ArcadeButton size="lg" variant="primary" onClick={() => setMethod('ens')} className="w-full">
            Enter ENS Name
          </ArcadeButton>
          <ArcadeButton size="lg" variant="secondary" onClick={() => setMethod('nfc')} className="w-full">
            Tap Card / Wristband
          </ArcadeButton>
          <ArcadeButton size="lg" variant="secondary" onClick={() => setMethod('qr')} className="w-full">
            Scan QR Code
          </ArcadeButton>
        </div>

        <Link href="/app/kiosk" className="mt-6">
          <span className="text-[8px] uppercase tracking-wider transition-colors" style={{ color: '#7a7a9a' }}>
            Back
          </span>
        </Link>
      </div>
    )
  }

  // ENS Name Input
  if (method === 'ens') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 gap-6">
        <div className="text-center space-y-2">
          <h1
            className="text-lg"
            style={{ color: '#667eea', textShadow: '0 0 10px rgba(102, 126, 234, 0.5)' }}
          >
            Enter ENS
          </h1>
          <p className="text-[8px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
            Type your ENS name to access wallet
          </p>
        </div>

        <div className="w-full max-w-xs mt-4 space-y-4">
          <div className="space-y-2">
            <label className="text-[8px] uppercase" style={{ color: '#7a7a9a' }}>ENS Name</label>
            <input
              type="text"
              value={ensInput}
              onChange={(e) => setEnsInput(e.target.value)}
              placeholder="yourname.ki0xk.eth"
              className="w-full p-3 text-[10px] focus:outline-none"
              style={{
                backgroundColor: '#0f0f24',
                border: '2px solid #2a2a4a',
                color: '#e0e8f0',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#667eea' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#2a2a4a' }}
            />
          </div>
          {error && (
            <p className="text-[8px]" style={{ color: '#ef4444' }}>{error}</p>
          )}
        </div>

        <div className="w-full max-w-xs space-y-3 mt-4">
          <ArcadeButton size="lg" variant="primary" onClick={handleEnsSubmit} className="w-full">
            Look Up Wallet
          </ArcadeButton>
          <button
            onClick={() => setMethod('select')}
            className="w-full text-[8px] uppercase tracking-wider py-2 transition-colors"
            style={{ color: '#7a7a9a' }}
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  // NFC Tap
  if (method === 'nfc') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 gap-6">
        <div className="text-center space-y-2">
          <h1
            className="text-lg"
            style={{ color: '#f093fb', textShadow: '0 0 10px rgba(240, 147, 251, 0.5)' }}
          >
            Tap Card
          </h1>
          <p className="text-[8px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
            Hold your card or wristband near reader
          </p>
        </div>

        <div className="my-6">
          <NFCIndicator status={nfcStatus} />
        </div>

        <div className="text-center min-h-[40px]">
          {nfcStatus === 'ready' && (
            <p className="text-[10px]" style={{ color: '#7a7a9a' }}>Ready to scan</p>
          )}
          {nfcStatus === 'scanning' && (
            <p className="text-[10px] animate-pulse" style={{ color: '#667eea' }}>Reading card...</p>
          )}
          {nfcStatus === 'success' && (
            <p className="text-[10px]" style={{ color: '#78ffd6' }}>Wallet found!</p>
          )}
        </div>

        {nfcStatus === 'ready' && (
          <ArcadeButton size="lg" variant="primary" onClick={handleNfcTap} className="w-full max-w-xs">
            Simulate Tap
          </ArcadeButton>
        )}

        <button
          onClick={() => setMethod('select')}
          className="mt-4 text-[8px] uppercase tracking-wider transition-colors"
          style={{ color: '#7a7a9a' }}
        >
          Back
        </button>
      </div>
    )
  }

  // QR Code
  if (method === 'qr') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 gap-6">
        <div className="text-center space-y-2">
          <h1
            className="text-lg"
            style={{ color: '#78ffd6', textShadow: '0 0 10px rgba(120, 255, 214, 0.5)' }}
          >
            Scan QR
          </h1>
          <p className="text-[8px] uppercase tracking-wider" style={{ color: '#7a7a9a' }}>
            Point camera at your wallet QR code
          </p>
        </div>

        {/* QR Scanner Area */}
        <div className="w-64 h-64 flex items-center justify-center mt-4">
          <PixelFrame className="w-full h-full">
            {qrScanning ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                <div
                  className="w-16 h-16 animate-spin"
                  style={{ border: '4px solid #2a2a4a', borderTopColor: '#78ffd6' }}
                />
                <p className="text-[10px] animate-pulse" style={{ color: '#78ffd6' }}>Scanning...</p>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="relative w-40 h-40">
                  <div className="absolute top-0 left-0 w-8 h-8" style={{ borderTop: '4px solid #78ffd6', borderLeft: '4px solid #78ffd6' }} />
                  <div className="absolute top-0 right-0 w-8 h-8" style={{ borderTop: '4px solid #667eea', borderRight: '4px solid #667eea' }} />
                  <div className="absolute bottom-0 left-0 w-8 h-8" style={{ borderBottom: '4px solid #f093fb', borderLeft: '4px solid #f093fb' }} />
                  <div className="absolute bottom-0 right-0 w-8 h-8" style={{ borderBottom: '4px solid #ffd700', borderRight: '4px solid #ffd700' }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-[8px]" style={{ color: '#7a7a9a' }}>Camera Preview</p>
                  </div>
                </div>
              </div>
            )}
          </PixelFrame>
        </div>

        {!qrScanning && (
          <ArcadeButton size="lg" variant="accent" onClick={handleQrScan} className="w-full max-w-xs mt-4">
            Simulate QR Scan
          </ArcadeButton>
        )}

        <button
          onClick={() => setMethod('select')}
          className="mt-4 text-[8px] uppercase tracking-wider transition-colors"
          style={{ color: '#7a7a9a' }}
        >
          Back
        </button>
      </div>
    )
  }

  return null
}
