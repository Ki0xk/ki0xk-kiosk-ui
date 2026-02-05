'use client'

import React from "react"
import { useEffect } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
}

export function Modal({ isOpen, onClose, children, title }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(10, 10, 26, 0.85)' }}
        onClick={onClose}
      />

      {/* Modal content */}
      <div
        className="relative z-10 w-[90%] max-w-md p-6"
        style={{
          backgroundColor: '#0f0f24',
          border: '3px solid transparent',
          borderImage: 'linear-gradient(135deg, #78ffd6, #667eea, #764ba2, #f093fb, #ffd700) 1',
          boxShadow: `
            0 0 20px rgba(102, 126, 234, 0.3),
            0 0 40px rgba(120, 255, 214, 0.1),
            inset -4px -4px 0px 0px rgba(0,0,0,0.3),
            inset 4px 4px 0px 0px rgba(255,255,255,0.05)
          `,
        }}
      >
        {/* Corner decorations */}
        <div className="absolute -top-[5px] -left-[5px] w-3 h-3" style={{ background: '#78ffd6' }} />
        <div className="absolute -top-[5px] -right-[5px] w-3 h-3" style={{ background: '#667eea' }} />
        <div className="absolute -bottom-[5px] -left-[5px] w-3 h-3" style={{ background: '#f093fb' }} />
        <div className="absolute -bottom-[5px] -right-[5px] w-3 h-3" style={{ background: '#ffd700' }} />

        {title && (
          <h2
            className="text-center text-xs mb-6"
            style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
          >
            {title}
          </h2>
        )}

        {children}
      </div>
    </div>
  )
}
