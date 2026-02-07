'use client'

import { ArcadeButton } from './ArcadeButton'

interface PinDisplayProps {
  pin: string
  walletId: string
  amount: string
  onDone: () => void
  onPrint?: () => void
}

export function PinDisplay({ pin, walletId, amount, onDone, onPrint }: PinDisplayProps) {
  const handlePrint = () => {
    if (onPrint) {
      onPrint()
    } else {
      window.print()
    }
  }

  // Format amount to 2 decimals max (avoid $0.060000)
  const formattedAmount = parseFloat(amount).toFixed(2)

  return (
    <div className="w-full flex flex-col items-center gap-5">
      {/* Header */}
      <div className="text-center">
        <p className="text-[13px] uppercase tracking-widest mb-2" style={{ color: '#7a7a9a' }}>
          Your Receipt
        </p>
        <div
          className="w-32 h-1 mx-auto"
          style={{
            background: 'linear-gradient(90deg, #78ffd6, #667eea, #764ba2, #f093fb, #ffd700)',
          }}
        />
      </div>

      {/* PIN display — large digits in individual boxes */}
      <div>
        <p className="text-sm uppercase tracking-widest text-center mb-3" style={{ color: '#78ffd6', textShadow: '0 0 8px rgba(120, 255, 214, 0.4)' }}>
          Your PIN
        </p>
        <div className="flex gap-2 justify-center">
          {pin.split('').map((digit, i) => (
            <div
              key={i}
              className="w-12 h-14 flex items-center justify-center text-xl"
              style={{
                backgroundColor: '#0f0f24',
                border: '3px solid #ffd700',
                color: '#ffd700',
                textShadow: '0 0 10px rgba(255, 215, 0, 0.6)',
                boxShadow: '0 0 12px rgba(255, 215, 0, 0.3), inset 2px 2px 0px 0px rgba(0,0,0,0.3)',
              }}
            >
              {digit}
            </div>
          ))}
        </div>
      </div>

      {/* Wallet ID */}
      <div className="text-center">
        <p className="text-sm uppercase tracking-widest mb-3" style={{ color: '#667eea', textShadow: '0 0 8px rgba(102, 126, 234, 0.4)' }}>
          Wallet ID
        </p>
        <div className="flex gap-2 justify-center">
          {walletId.split('').map((char, i) => (
            <div
              key={i}
              className="w-11 h-13 flex items-center justify-center text-lg"
              style={{
                backgroundColor: '#0f0f24',
                border: '3px solid #667eea',
                color: '#667eea',
                textShadow: '0 0 8px rgba(102, 126, 234, 0.5)',
                boxShadow: '0 0 10px rgba(102, 126, 234, 0.2), inset 2px 2px 0px 0px rgba(0,0,0,0.3)',
              }}
            >
              {char}
            </div>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div
        className="w-full p-4 text-center border-2"
        style={{
          backgroundColor: '#0f0f24',
          borderImage: 'linear-gradient(135deg, #78ffd6, #667eea, #764ba2, #f093fb, #ffd700) 1',
        }}
      >
        <p className="text-[13px] uppercase tracking-widest mb-1" style={{ color: '#7a7a9a' }}>
          Amount
        </p>
        <p className="text-2xl" style={{ color: '#78ffd6', textShadow: '0 0 10px rgba(120, 255, 214, 0.5)' }}>
          ${formattedAmount} USDC
        </p>
      </div>

      {/* Warning — red, tilting animation */}
      <div
        className="w-full p-3 text-center border-2 tilt-warning"
        style={{
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          borderColor: '#ef4444',
          boxShadow: '0 0 12px rgba(239, 68, 68, 0.2)',
        }}
      >
        <p
          className="text-sm uppercase tracking-wider font-bold"
          style={{
            color: '#ef4444',
            textShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
          }}
        >
          Save this PIN — it cannot be recovered
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 w-full">
        <ArcadeButton variant="secondary" size="md" onClick={handlePrint} className="flex-1">
          Print
        </ArcadeButton>
        <ArcadeButton variant="primary" size="md" onClick={onDone} className="flex-1">
          Done
        </ArcadeButton>
      </div>
    </div>
  )
}
