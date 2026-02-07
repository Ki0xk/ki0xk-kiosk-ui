'use client'

import React from "react"

interface ArcadeButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'accent' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
}

export function ArcadeButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
}: ArcadeButtonProps) {
  const baseStyles = 'relative uppercase tracking-wider touch-active transition-all duration-100 select-none'

  const variantStyles = {
    primary: 'bg-[#ffd700] text-[#0a0a1a] hover:bg-[#ffe44d]',
    secondary: 'bg-[#141430] text-[#e0e8f0] border-2 border-[#2a2a4a] hover:border-[#667eea] hover:text-[#667eea]',
    accent: 'bg-[#78ffd6] text-[#0a0a1a] hover:bg-[#9bffe3]',
    danger: 'bg-[#ef4444] text-[#ffffff] hover:bg-[#f87171]',
  }

  const glowStyles = {
    primary: '0 0 12px rgba(255, 215, 0, 0.4), 0 0 24px rgba(255, 215, 0, 0.15)',
    secondary: 'none',
    accent: '0 0 12px rgba(120, 255, 214, 0.4), 0 0 24px rgba(120, 255, 214, 0.15)',
    danger: '0 0 12px rgba(239, 68, 68, 0.4)',
  }

  const sizeStyles = {
    sm: 'px-4 py-2 text-[11px]',
    md: 'px-6 py-4 text-sm',
    lg: 'px-8 py-5 text-xs',
  }

  const disabledStyles = disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${disabledStyles}
        ${className}
      `}
      style={{
        boxShadow: disabled ? 'none' : `
          inset -3px -3px 0px 0px rgba(0,0,0,0.25),
          inset 3px 3px 0px 0px rgba(255,255,255,0.1),
          4px 4px 0px 0px rgba(0,0,0,0.5),
          ${glowStyles[variant]}
        `,
      }}
    >
      {children}
    </button>
  )
}
