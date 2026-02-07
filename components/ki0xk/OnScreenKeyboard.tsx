'use client'

import { useState } from 'react'

interface OnScreenKeyboardProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder?: string
  maxLength?: number
}

const letterRows = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
]

const numberRow = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

export function OnScreenKeyboard({ value, onChange, onSubmit, placeholder = 'Type here...', maxLength = 42 }: OnScreenKeyboardProps) {
  const [caps, setCaps] = useState(false)

  const handleKey = (key: string) => {
    if (value.length < maxLength) {
      onChange(value + (caps ? key.toUpperCase() : key.toLowerCase()))
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
      case 'CAPS':
        setCaps(!caps)
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

  const displayKey = (key: string) => caps ? key.toUpperCase() : key.toLowerCase()

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Display field */}
      <div
        className="mb-1 p-2 border-2 text-left min-h-[36px] flex items-center"
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

      {/* Keyboard — wide rectangle layout for tablet */}
      <div className="flex flex-col gap-[3px]">
        {/* Row 0: Numbers */}
        <div className="flex gap-[3px] justify-center">
          {numberRow.map((n) => (
            <button
              key={n}
              onClick={() => { if (value.length < maxLength) onChange(value + n) }}
              className="flex-1 min-w-0 py-[6px] text-sm transition-all touch-active"
              style={keyStyle()}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#667eea' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2a4a' }}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Row 1: QWERTYUIOP */}
        <div className="flex gap-[3px] justify-center">
          {letterRows[0].map((key) => (
            <button
              key={key}
              onClick={() => handleKey(key)}
              className="flex-1 min-w-0 py-[6px] text-sm transition-all touch-active"
              style={keyStyle()}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#667eea' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2a4a' }}
            >
              {displayKey(key)}
            </button>
          ))}
        </div>

        {/* Row 2: ASDFGHJKL */}
        <div className="flex gap-[3px] justify-center px-4">
          {letterRows[1].map((key) => (
            <button
              key={key}
              onClick={() => handleKey(key)}
              className="flex-1 min-w-0 py-[6px] text-sm transition-all touch-active"
              style={keyStyle()}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#667eea' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2a4a' }}
            >
              {displayKey(key)}
            </button>
          ))}
        </div>

        {/* Row 3: CAPS + ZXCVBNM + ← */}
        <div className="flex gap-[3px] justify-center">
          <button
            onClick={() => handleSpecial('CAPS')}
            className="px-3 py-[6px] text-[0.8125rem] uppercase transition-all touch-active flex items-center gap-1"
            style={{
              ...keyStyle(true),
              borderColor: caps ? '#ffd700' : '#2a2a4a',
              color: caps ? '#ffd700' : '#7a7a9a',
              backgroundColor: caps ? 'rgba(255, 215, 0, 0.1)' : '#141430',
              boxShadow: caps
                ? '0 0 8px rgba(255, 215, 0, 0.2), inset -1px -1px 0px 0px rgba(0,0,0,0.3)'
                : 'inset -1px -1px 0px 0px rgba(0,0,0,0.3), 1px 1px 0px 0px rgba(0,0,0,0.3)',
            }}
          >
            {caps ? '\u2B06 CAPS' : '\u21E7 caps'}
          </button>
          {letterRows[2].map((key) => (
            <button
              key={key}
              onClick={() => handleKey(key)}
              className="flex-1 min-w-0 py-[6px] text-sm transition-all touch-active"
              style={keyStyle()}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#667eea' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2a4a' }}
            >
              {displayKey(key)}
            </button>
          ))}
          <button
            onClick={() => handleSpecial('DEL')}
            className="px-4 py-[6px] text-lg transition-all touch-active"
            style={keyStyle(true)}
          >
            {'\u2190'}
          </button>
        </div>

        {/* Row 4: Special keys — 0x, SPACE, .eth, CLR */}
        <div className="flex gap-[3px]">
          <button
            onClick={() => handleSpecial('0X')}
            className="px-3 py-[6px] text-[0.8125rem] uppercase transition-all touch-active"
            style={keyStyle(true)}
          >
            0x
          </button>
          <button
            onClick={() => handleSpecial('SPACE')}
            className="flex-1 py-[6px] text-[0.8125rem] uppercase transition-all touch-active"
            style={keyStyle(true)}
          >
            SPACE
          </button>
          <button
            onClick={() => handleSpecial('.ETH')}
            className="px-4 py-[6px] text-[0.8125rem] transition-all touch-active"
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
            className="px-3 py-[6px] text-[0.8125rem] uppercase transition-all touch-active"
            style={keyStyle(true)}
          >
            CLR
          </button>
        </div>

        {/* Confirm button */}
        <button
          onClick={onSubmit}
          disabled={!value}
          className="w-full py-2 text-sm uppercase tracking-wider transition-all touch-active mt-1"
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
