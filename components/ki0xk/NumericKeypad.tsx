'use client'

interface NumericKeypadProps {
  value: string
  onChange: (value: string) => void
  maxLength?: number
  isPin?: boolean
}

export function NumericKeypad({ value, onChange, maxLength = 6, isPin = false }: NumericKeypadProps) {
  const handlePress = (key: string) => {
    if (key === 'clear') {
      onChange('')
    } else if (key === 'back') {
      onChange(value.slice(0, -1))
    } else if (value.length < maxLength) {
      onChange(value + key)
    }
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back']

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
          {isPin ? value.replace(/./g, '*') : value || '\u00A0'}
        </p>
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-2">
        {keys.map((key) => (
          <button
            key={key}
            onClick={() => handlePress(key)}
            className="p-4 text-sm uppercase transition-all duration-100 touch-active"
            style={{
              backgroundColor: key === 'clear' || key === 'back' ? '#141430' : '#0f0f24',
              color: key === 'clear' || key === 'back' ? '#7a7a9a' : '#e0e8f0',
              border: `2px solid ${key === 'clear' || key === 'back' ? '#2a2a4a' : '#2a2a4a'}`,
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
              e.currentTarget.style.color = key === 'clear' || key === 'back' ? '#7a7a9a' : '#e0e8f0'
            }}
          >
            {key === 'clear' ? 'CLR' : key === 'back' ? 'DEL' : key}
          </button>
        ))}
      </div>
    </div>
  )
}
