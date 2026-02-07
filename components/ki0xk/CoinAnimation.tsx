'use client'

interface CoinAnimationProps {
  isAnimating: boolean
  amount: number
}

export function CoinAnimation({ isAnimating, amount }: CoinAnimationProps) {
  if (!isAnimating) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
      {/* Coins */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="absolute coin-animation"
          style={{
            animationDelay: `${i * 0.15}s`,
            left: `${30 + i * 10}%`,
          }}
        >
          <div
            className="w-12 h-12 flex items-center justify-center text-[0.6875rem] font-bold"
            style={{
              background: 'linear-gradient(135deg, #ffd700, #78ffd6)',
              color: '#0a0a1a',
              boxShadow: '0 0 16px rgba(255, 215, 0, 0.6), 0 0 32px rgba(120, 255, 214, 0.3)',
            }}
          >
            $
          </div>
        </div>
      ))}

      {/* Amount display */}
      <div
        className="absolute text-4xl coin-animation"
        style={{
          animationDelay: '0.5s',
          color: '#ffd700',
          textShadow: '0 0 12px #ffd700, 0 0 24px rgba(255, 215, 0, 0.5)',
        }}
      >
        +${amount}
      </div>
    </div>
  )
}
