'use client'

import { useState } from 'react'

interface OnScreenKeyboardProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder?: string
  maxLength?: number
}

const rows = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
]

export function OnScreenKeyboard({ value, onChange, onSubmit, placeholder = 'Type here...', maxLength = 42 }: OnScreenKeyboardProps) {
  const [shift, setShift] = useState(false)

  const handleKey = (key: string) => {
    if (value.length < maxLength) {
      onChange(value + (shift ? key.toUpperCase() : key.toLowerCase()))
      if (shift) setShift(false)
    }
  }

  const handleSpecial = (action: string) => {
    switch (action) {
      case 'DEL':
        onChange(value.slice(0, -1))
        break
      case 'SPACE':
        if (value.length < maxLength) onChange(value + ' ')
        break
      case '.ETH':
        if (value.length + 4 <= maxLength) onChange(value + '.eth')
        break
      case '0X':
        if (value.length === 0) onChange('0x')
        break
      case 'CLR':
        onChange('')
        break
      case 'SHIFT':
        setShift(!shift)
        break
    }
  }

  const keyStyle = (isSpecial = false) => ({
    backgroundColor: isSpecial ? '#141430' : '#0f0f24',
    color: isSpecial ? '#7a7a9a' : '#e0e8f0',
    border: '2px solid #2a2a4a',
    boxShadow: `
      inset -1px -1px 0px 0px rgba(0,0,0,0.3),
      inset 1px 1px 0px 0px rgba(255,255,255,0.03),
      1px 1px 0px 0px rgba(0,0,0,0.3)
    `,
  })

  return (
    <div className="w-full">
      {/* Display */}
      <div
        className="mb-3 p-3 border-2 text-left min-h-[44px] flex items-center"
        style={{
          backgroundColor: '#0f0f24',
          borderColor: '#667eea',
          boxShadow: 'inset 2px 2px 0px 0px rgba(0,0,0,0.3), 0 0 8px rgba(102, 126, 234, 0.2)',
        }}
      >
        <p
          className="text-sm tracking-wide break-all w-full"
          style={{
            color: value ? '#ffd700' : '#7a7a9a',
            textShadow: value ? '0 0 8px rgba(255, 215, 0, 0.4)' : 'none',
          }}
        >
          {value || placeholder}
        </p>
      </div>

      {/* Keyboard rows */}
      <div className="flex flex-col gap-1">
        {/* Row 1: QWERTYUIOP */}
        <div className="flex gap-1 justify-center">
          {rows[0].map((key) => (
            <button
              key={key}
              onClick={() => handleKey(key)}
              className="flex-1 min-w-0 py-2 text-[9px] uppercase transition-all touch-active"
              style={keyStyle()}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#667eea' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2a4a' }}
            >
              {shift ? key : key.toLowerCase()}
            </button>
          ))}
        </div>

        {/* Row 2: ASDFGHJKL */}
        <div className="flex gap-1 justify-center px-3">
          {rows[1].map((key) => (
            <button
              key={key}
              onClick={() => handleKey(key)}
              className="flex-1 min-w-0 py-2 text-[9px] uppercase transition-all touch-active"
              style={keyStyle()}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#667eea' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2a4a' }}
            >
              {shift ? key : key.toLowerCase()}
            </button>
          ))}
        </div>

        {/* Row 3: SHIFT + ZXCVBNM + DEL */}
        <div className="flex gap-1 justify-center">
          <button
            onClick={() => handleSpecial('SHIFT')}
            className="px-2 py-2 text-[8px] uppercase transition-all touch-active"
            style={{
              ...keyStyle(true),
              borderColor: shift ? '#667eea' : '#2a2a4a',
              color: shift ? '#667eea' : '#7a7a9a',
            }}
          >
            SHIFT
          </button>
          {rows[2].map((key) => (
            <button
              key={key}
              onClick={() => handleKey(key)}
              className="flex-1 min-w-0 py-2 text-[9px] uppercase transition-all touch-active"
              style={keyStyle()}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#667eea' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2a4a' }}
            >
              {shift ? key : key.toLowerCase()}
            </button>
          ))}
          <button
            onClick={() => handleSpecial('DEL')}
            className="px-2 py-2 text-[8px] uppercase transition-all touch-active"
            style={keyStyle(true)}
          >
            DEL
          </button>
        </div>

        {/* Row 4: Special keys */}
        <div className="flex gap-1">
          <button
            onClick={() => handleSpecial('0X')}
            className="px-3 py-2 text-[8px] uppercase transition-all touch-active"
            style={keyStyle(true)}
          >
            0x
          </button>
          <button
            onClick={() => handleSpecial('SPACE')}
            className="flex-1 py-2 text-[8px] uppercase transition-all touch-active"
            style={keyStyle(true)}
          >
            SPACE
          </button>
          <button
            onClick={() => handleSpecial('.ETH')}
            className="px-3 py-2 text-[8px] transition-all touch-active"
            style={{
              ...keyStyle(),
              color: '#78ffd6',
              borderColor: '#78ffd6',
            }}
          >
            .eth
          </button>
          <button
            onClick={() => handleSpecial('CLR')}
            className="px-3 py-2 text-[8px] uppercase transition-all touch-active"
            style={keyStyle(true)}
          >
            CLR
          </button>
        </div>

        {/* Numbers row */}
        <div className="flex gap-1 justify-center">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((n) => (
            <button
              key={n}
              onClick={() => { if (value.length < maxLength) onChange(value + n) }}
              className="flex-1 min-w-0 py-2 text-[9px] transition-all touch-active"
              style={keyStyle()}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#667eea' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2a4a' }}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Submit button */}
        <button
          onClick={onSubmit}
          disabled={!value}
          className="w-full py-3 text-[10px] uppercase tracking-wider transition-all touch-active mt-1"
          style={{
            backgroundColor: value ? '#ffd700' : '#141430',
            color: value ? '#0a0a1a' : '#7a7a9a',
            border: `2px solid ${value ? '#ffd700' : '#2a2a4a'}`,
            boxShadow: value
              ? 'inset -2px -2px 0px 0px rgba(0,0,0,0.2), 2px 2px 0px 0px rgba(0,0,0,0.4), 0 0 12px rgba(255, 215, 0, 0.3)'
              : 'none',
            opacity: value ? 1 : 0.5,
          }}
        >
          Confirm
        </button>
      </div>
    </div>
  )
}
