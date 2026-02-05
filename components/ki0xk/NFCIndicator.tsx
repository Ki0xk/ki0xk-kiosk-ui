'use client'

interface NFCIndicatorProps {
  status: 'ready' | 'scanning' | 'success' | 'error'
}

export function NFCIndicator({ status }: NFCIndicatorProps) {
  const statusConfig = {
    ready: {
      color: 'text-[#7a7a9a]',
      borderColor: '#2a2a4a',
      glowColor: 'transparent',
      label: 'Ready',
      animate: false,
    },
    scanning: {
      color: 'text-[#667eea]',
      borderColor: '#667eea',
      glowColor: '#667eea',
      label: 'Scanning',
      animate: true,
    },
    success: {
      color: 'text-[#78ffd6]',
      borderColor: '#78ffd6',
      glowColor: '#78ffd6',
      label: 'Connected',
      animate: false,
    },
    error: {
      color: 'text-[#ef4444]',
      borderColor: '#ef4444',
      glowColor: '#ef4444',
      label: 'Error',
      animate: false,
    },
  }

  const config = statusConfig[status]

  return (
    <div className="flex flex-col items-center gap-4">
      {/* NFC Icon */}
      <div
        className={`
          relative w-24 h-24 flex items-center justify-center
          ${config.animate ? 'nfc-pulse' : ''}
        `}
      >
        <svg
          viewBox="0 0 64 64"
          className={`w-full h-full ${config.color}`}
          fill="currentColor"
          style={{
            filter: config.glowColor !== 'transparent'
              ? `drop-shadow(0 0 8px ${config.glowColor}) drop-shadow(0 0 16px ${config.glowColor})`
              : 'none',
          }}
        >
          {/* NFC waves */}
          <path d="M32 8v4M32 52v4M8 32h4M52 32h4" stroke="currentColor" strokeWidth="4" fill="none" />
          <circle cx="32" cy="32" r="8" />
          <path
            d="M32 16c8.837 0 16 7.163 16 16s-7.163 16-16 16"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            opacity={status === 'ready' ? 0.3 : 1}
          />
          <path
            d="M32 24c4.418 0 8 3.582 8 8s-3.582 8-8 8"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            opacity={status === 'ready' ? 0.3 : 1}
          />
        </svg>

        {/* Pulse rings for scanning */}
        {config.animate && (
          <>
            <div
              className="absolute inset-0 animate-ping"
              style={{ border: `2px solid ${config.borderColor}`, opacity: 0.3 }}
            />
            <div
              className="absolute inset-2 animate-ping"
              style={{ border: `2px solid ${config.borderColor}`, opacity: 0.2, animationDelay: '200ms' }}
            />
          </>
        )}
      </div>

      {/* Status label */}
      <p className={`text-[10px] uppercase tracking-wider ${config.color}`}>
        {config.label}
      </p>
    </div>
  )
}
