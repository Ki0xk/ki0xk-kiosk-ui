'use client'

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
    <div className="w-full h-full flex flex-col">
      {/* iOS-style header: Print | Receipt | Done */}
      <div className="flex items-center justify-between px-1 mb-1">
        <button
          onClick={handlePrint}
          className="text-[11px] uppercase tracking-wider px-2 py-0.5 border"
          style={{ color: '#7a7a9a', borderColor: '#7a7a9a' }}
        >
          Print
        </button>
        <p className="text-[13px] uppercase tracking-widest" style={{ color: '#7a7a9a' }}>
          Receipt
        </p>
        <button
          onClick={onDone}
          className="text-[11px] uppercase tracking-wider px-2 py-0.5 border"
          style={{ color: '#78ffd6', borderColor: '#78ffd6' }}
        >
          Done ›
        </button>
      </div>
      <div
        className="w-24 h-0.5 mx-auto mb-2"
        style={{
          background: 'linear-gradient(90deg, #78ffd6, #667eea, #764ba2, #f093fb, #ffd700)',
        }}
      />

      {/* Compact content */}
      <div className="flex-1 flex flex-col items-center gap-2 min-h-0">
        {/* PIN */}
        <div>
          <p className="text-[11px] uppercase tracking-widest text-center mb-1" style={{ color: '#78ffd6', textShadow: '0 0 8px rgba(120, 255, 214, 0.4)' }}>
            Your PIN
          </p>
          <div className="flex gap-1.5 justify-center">
            {pin.split('').map((digit, i) => (
              <div
                key={i}
                className="w-9 h-10 flex items-center justify-center text-lg"
                style={{
                  backgroundColor: '#0f0f24',
                  border: '2px solid #ffd700',
                  color: '#ffd700',
                  textShadow: '0 0 10px rgba(255, 215, 0, 0.6)',
                  boxShadow: '0 0 8px rgba(255, 215, 0, 0.3), inset 2px 2px 0px 0px rgba(0,0,0,0.3)',
                }}
              >
                {digit}
              </div>
            ))}
          </div>
        </div>

        {/* Wallet ID */}
        <div>
          <p className="text-[11px] uppercase tracking-widest text-center mb-1" style={{ color: '#667eea', textShadow: '0 0 8px rgba(102, 126, 234, 0.4)' }}>
            Wallet ID
          </p>
          <div className="flex gap-1.5 justify-center">
            {walletId.split('').map((char, i) => (
              <div
                key={i}
                className="w-8 h-9 flex items-center justify-center text-sm"
                style={{
                  backgroundColor: '#0f0f24',
                  border: '2px solid #667eea',
                  color: '#667eea',
                  textShadow: '0 0 8px rgba(102, 126, 234, 0.5)',
                  boxShadow: '0 0 8px rgba(102, 126, 234, 0.2), inset 2px 2px 0px 0px rgba(0,0,0,0.3)',
                }}
              >
                {char}
              </div>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div
          className="w-full p-2 text-center border-2"
          style={{
            backgroundColor: '#0f0f24',
            borderImage: 'linear-gradient(135deg, #78ffd6, #667eea, #764ba2, #f093fb, #ffd700) 1',
          }}
        >
          <p className="text-[11px] uppercase tracking-widest" style={{ color: '#7a7a9a' }}>
            Amount
          </p>
          <p className="text-lg" style={{ color: '#78ffd6', textShadow: '0 0 10px rgba(120, 255, 214, 0.5)' }}>
            ${formattedAmount} USDC
          </p>
        </div>

        {/* Warning */}
        <div
          className="w-full p-1.5 text-center border-2 tilt-warning"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            borderColor: '#ef4444',
            boxShadow: '0 0 12px rgba(239, 68, 68, 0.2)',
          }}
        >
          <p
            className="text-[11px] uppercase tracking-wider font-bold"
            style={{
              color: '#ef4444',
              textShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
            }}
          >
            Save this PIN — it cannot be recovered
          </p>
        </div>
      </div>
    </div>
  )
}
