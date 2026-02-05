'use client'

import React from "react"

interface PixelFrameProps {
  children: React.ReactNode
  className?: string
}

export function PixelFrame({ children, className = '' }: PixelFrameProps) {
  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Outer cabinet with holographic gradient border */}
      <div
        className="absolute inset-0 p-3"
        style={{
          background: 'linear-gradient(160deg, #141430 0%, #0f0f24 40%, #141430 100%)',
        }}
      >
        {/* Inner holographic border */}
        <div
          className="relative w-full h-full bg-background"
          style={{
            border: '3px solid transparent',
            borderImage: 'linear-gradient(135deg, #78ffd6, #667eea, #764ba2, #f093fb, #ffd700) 1',
          }}
        >
          {/* Corner decorations - holographic gradient */}
          <div className="absolute -top-[5px] -left-[5px] w-3 h-3" style={{ background: '#78ffd6' }} />
          <div className="absolute -top-[5px] -right-[5px] w-3 h-3" style={{ background: '#667eea' }} />
          <div className="absolute -bottom-[5px] -left-[5px] w-3 h-3" style={{ background: '#f093fb' }} />
          <div className="absolute -bottom-[5px] -right-[5px] w-3 h-3" style={{ background: '#ffd700' }} />

          {/* Scanlines overlay */}
          <div className="absolute inset-0 scanlines pointer-events-none" />

          {/* Content */}
          <div className="relative w-full h-full overflow-hidden pixel-grid">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
