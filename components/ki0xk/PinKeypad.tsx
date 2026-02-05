'use client'

interface PinKeypadProps {
  value: string
  onChange: (value: string) => void
  maxLength?: number
}

// Phone-style 4x3 grid with * and # (matches physical keypads)
const keys = [
  '1', '2', '3',
  '4', '5', '6',
  '7', '8', '9',
  '*', '0', '#',
]

export function PinKeypad({ value, onChange, maxLength = 6 }: PinKeypadProps) {
  const handlePress = (key: string) => {
    // * = clear, # = backspace (physical keypad convention)
    if (key === '*') {
      onChange('')
    } else if (key === '#') {
      onChange(value.slice(0, -1))
    } else if (value.length < maxLength) {
      onChange(value + key)
    }
  }

  return (
    <div className="w-full max-w-xs mx-auto">
      {/* Display — masked with asterisks */}
      <div
        className="mb-4 p-4 border-2 text-center"
        style={{
          backgroundColor: '#0f0f24',
          borderColor: '#667eea',
          boxShadow: 'inset 2px 2px 0px 0px rgba(0,0,0,0.3), 0 0 8px rgba(102, 126, 234, 0.2)',
        }}
      >
        <div className="flex justify-center gap-2 min-h-[32px] items-center">
          {Array.from({ length: maxLength }).map((_, i) => (
            <div
              key={i}
              className="w-6 h-8 flex items-center justify-center text-lg"
              style={{
                backgroundColor: i < value.length ? '#141430' : '#0a0a1a',
                border: `2px solid ${i < value.length ? '#ffd700' : '#2a2a4a'}`,
                color: '#ffd700',
                textShadow: '0 0 8px rgba(255, 215, 0, 0.4)',
              }}
            >
              {i < value.length ? '*' : ''}
            </div>
          ))}
        </div>
      </div>

      {/* 4x3 Keypad */}
      <div className="grid grid-cols-3 gap-2">
        {keys.map((key) => {
          const isSpecial = key === '*' || key === '#'

          return (
            <button
              key={key}
              onClick={() => handlePress(key)}
              className="p-4 text-sm uppercase transition-all duration-100 touch-active"
              style={{
                backgroundColor: isSpecial ? '#141430' : '#0f0f24',
                color: isSpecial ? '#7a7a9a' : '#e0e8f0',
                border: `2px solid #2a2a4a`,
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
                e.currentTarget.style.borderColor = '#2a2a4a'
                e.currentTarget.style.color = isSpecial ? '#7a7a9a' : '#e0e8f0'
              }}
            >
              {key === '*' ? 'CLR' : key === '#' ? 'DEL' : key}
            </button>
          )
        })}
      </div>

      {/* Key legend */}
      <div className="flex justify-between mt-2 px-1">
        <p className="text-[7px]" style={{ color: '#7a7a9a' }}>* = Clear</p>
        <p className="text-[7px]" style={{ color: '#7a7a9a' }}># = Delete</p>
      </div>
    </div>
  )
}
