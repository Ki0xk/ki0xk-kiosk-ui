'use client'

import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type: 'success' | 'error'
  isVisible: boolean
  onClose: () => void
  duration?: number
}

export function Toast({ message, type, isVisible, onClose, duration = 3000 }: ToastProps) {
  const [isShowing, setIsShowing] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setIsShowing(true)
      const timer = setTimeout(() => {
        setIsShowing(false)
        setTimeout(onClose, 300)
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [isVisible, duration, onClose])

  if (!isVisible && !isShowing) return null

  const typeConfig = {
    success: {
      borderColor: '#78ffd6',
      backgroundColor: 'rgba(120, 255, 214, 0.12)',
      color: '#78ffd6',
      glow: '0 0 16px rgba(120, 255, 214, 0.3)',
    },
    error: {
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      color: '#ef4444',
      glow: '0 0 16px rgba(239, 68, 68, 0.3)',
    },
  }

  const config = typeConfig[type]

  return (
    <div
      className={`
        fixed top-8 left-1/2 -translate-x-1/2 z-50
        px-6 py-4
        transition-all duration-300
        ${isShowing ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}
      `}
      style={{
        border: `3px solid ${config.borderColor}`,
        backgroundColor: config.backgroundColor,
        color: config.color,
        boxShadow: config.glow,
      }}
    >
      <p className="text-sm uppercase tracking-wider">{message}</p>
    </div>
  )
}
