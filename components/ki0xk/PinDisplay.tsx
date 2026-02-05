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

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {/* Header */}
      <div className="text-center">
        <p className="text-[8px] uppercase tracking-widest mb-2" style={{ color: '#7a7a9a' }}>
          Your Receipt
        </p>
        <div
          className="w-24 h-1 mx-auto"
          style={{
            background: 'linear-gradient(90deg, #78ffd6, #667eea, #764ba2, #f093fb, #ffd700)',
          }}
        />
      </div>

      {/* PIN display — large digits in individual boxes */}
      <div>
        <p className="text-[8px] uppercase tracking-widest text-center mb-2" style={{ color: '#78ffd6' }}>
          Your PIN
        </p>
        <div className="flex gap-2 justify-center">
          {pin.split('').map((digit, i) => (
            <div
              key={i}
              className="w-10 h-12 flex items-center justify-center text-lg"
              style={{
                backgroundColor: '#0f0f24',
                border: '2px solid #ffd700',
                color: '#ffd700',
                textShadow: '0 0 8px rgba(255, 215, 0, 0.5)',
                boxShadow: '0 0 8px rgba(255, 215, 0, 0.2), inset 2px 2px 0px 0px rgba(0,0,0,0.3)',
              }}
            >
              {digit}
            </div>
          ))}
        </div>
      </div>

      {/* Wallet ID */}
      <div className="text-center">
        <p className="text-[8px] uppercase tracking-widest mb-1" style={{ color: '#667eea' }}>
          Wallet ID
        </p>
        <div className="flex gap-2 justify-center">
          {walletId.split('').map((char, i) => (
            <div
              key={i}
              className="w-8 h-10 flex items-center justify-center text-sm"
              style={{
                backgroundColor: '#0f0f24',
                border: '2px solid #667eea',
                color: '#667eea',
                textShadow: '0 0 8px rgba(102, 126, 234, 0.4)',
                boxShadow: 'inset 2px 2px 0px 0px rgba(0,0,0,0.3)',
              }}
            >
              {char}
            </div>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div
        className="w-full p-3 text-center border-2"
        style={{
          backgroundColor: '#0f0f24',
          borderImage: 'linear-gradient(135deg, #78ffd6, #667eea, #764ba2, #f093fb, #ffd700) 1',
        }}
      >
        <p className="text-[8px] uppercase tracking-widest mb-1" style={{ color: '#7a7a9a' }}>
          Amount
        </p>
        <p className="text-xl" style={{ color: '#78ffd6', textShadow: '0 0 8px rgba(120, 255, 214, 0.4)' }}>
          ${amount} USDC
        </p>
      </div>

      {/* Warning */}
      <div
        className="w-full p-2 text-center border"
        style={{ backgroundColor: '#141430', borderColor: '#ffd700' }}
      >
        <p className="text-[8px] uppercase tracking-wider" style={{ color: '#ffd700' }}>
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
