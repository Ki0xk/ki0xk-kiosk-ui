'use client'

interface WalletIdKeypadProps {
  value: string
  onChange: (value: string) => void
  maxLength?: number
}

// 4x4 grid: 0-9 + A, B, C, D (matches physical keypad with 0-9, A-D)
const keys = [
  '1', '2', '3', 'A',
  '4', '5', '6', 'B',
  '7', '8', '9', 'C',
  'CLR', '0', 'DEL', 'D',
]

export function WalletIdKeypad({ value, onChange, maxLength = 4 }: WalletIdKeypadProps) {
  const handlePress = (key: string) => {
    if (key === 'CLR') {
      onChange('')
    } else if (key === 'DEL') {
      onChange(value.slice(0, -1))
    } else if (value.length < maxLength) {
      onChange(value + key)
    }
  }

  return (
    <div className="w-full max-w-xs mx-auto">
      {/* Display */}
      <div
        className="mb-4 p-4 border-2 text-center"
        style={{
          backgroundColor: '#0f0f24',
          borderColor: '#667eea',
          boxShadow: 'inset 2px 2px 0px 0px rgba(0,0,0,0.3), 0 0 8px rgba(102, 126, 234, 0.2)',
        }}
      >
        <p
          className="text-2xl tracking-[0.5em] min-h-[32px]"
          style={{ color: '#ffd700', textShadow: '0 0 8px rgba(255, 215, 0, 0.4)' }}
        >
          {value || '\u00A0'}
        </p>
      </div>

      {/* 4x4 Keypad */}
      <div className="grid grid-cols-4 gap-2">
        {keys.map((key) => {
          const isSpecial = key === 'CLR' || key === 'DEL'
          const isLetter = /^[A-D]$/.test(key)

          return (
            <button
              key={key}
              onClick={() => handlePress(key)}
              className="p-3 text-sm uppercase transition-all duration-100 touch-active"
              style={{
                backgroundColor: isSpecial ? '#141430' : '#0f0f24',
                color: isSpecial ? '#7a7a9a' : isLetter ? '#78ffd6' : '#e0e8f0',
                border: `2px solid ${isLetter ? '#78ffd6' : '#2a2a4a'}`,
                boxShadow: `
                  inset -2px -2px 0px 0px rgba(0,0,0,0.3),
                  inset 2px 2px 0px 0px rgba(255,255,255,0.03),
                  2px 2px 0px 0px rgba(0,0,0,0.3)
                `,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#667eea'
                e.currentTarget.style.color = '#667eea'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = isLetter ? '#78ffd6' : '#2a2a4a'
                e.currentTarget.style.color = isSpecial ? '#7a7a9a' : isLetter ? '#78ffd6' : '#e0e8f0'
              }}
            >
              {key}
            </button>
          )
        })}
      </div>
    </div>
  )
}
