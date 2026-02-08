'use client'

import { SUPPORTED_CHAINS, CHAIN_OPTIONS, type ChainKey } from '@/lib/constants'

interface ChainSelectorProps {
  selectedChain: ChainKey
  onSelect: (chainKey: ChainKey) => void
  gasStatus?: Record<string, { hasGas: boolean }>
}

export function ChainSelector({ selectedChain, onSelect, gasStatus }: ChainSelectorProps) {
  return (
    <div className="w-full space-y-2">
      {CHAIN_OPTIONS.map((key) => {
        const chain = SUPPORTED_CHAINS[key]
        const isSelected = key === selectedChain
        const noGas = gasStatus && gasStatus[key] && !gasStatus[key].hasGas
        const disabled = !!noGas

        return (
          <button
            key={key}
            onClick={() => !disabled && onSelect(key)}
            disabled={disabled}
            className="w-full flex items-center justify-between p-3 transition-all duration-100 touch-active"
            style={{
              backgroundColor: isSelected ? '#141430' : '#0f0f24',
              border: `2px solid ${disabled ? '#3a3a5a' : isSelected ? '#78ffd6' : '#2a2a4a'}`,
              boxShadow: isSelected && !disabled
                ? '0 0 8px rgba(120, 255, 214, 0.2), inset -2px -2px 0px 0px rgba(0,0,0,0.2)'
                : 'inset -2px -2px 0px 0px rgba(0,0,0,0.2), 1px 1px 0px 0px rgba(0,0,0,0.3)',
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <div className="flex flex-col items-start gap-1">
              <span
                className="text-sm uppercase tracking-wider"
                style={{
                  color: disabled ? '#5a5a7a' : isSelected ? '#78ffd6' : '#e0e8f0',
                  textShadow: isSelected && !disabled ? '0 0 8px rgba(120, 255, 214, 0.4)' : 'none',
                }}
              >
                {chain.name}
                {disabled && (
                  <span className="ml-2 text-[0.625rem]" style={{ color: '#ef4444' }}>(no gas)</span>
                )}
              </span>
              <span className="text-[0.625rem]" style={{ color: '#7a7a9a' }}>
                Chain ID: {chain.chainId}
              </span>
            </div>

            {/* Selection indicator */}
            <div
              className="w-4 h-4 flex items-center justify-center"
              style={{
                border: `2px solid ${disabled ? '#3a3a5a' : isSelected ? '#78ffd6' : '#2a2a4a'}`,
                backgroundColor: isSelected && !disabled ? '#78ffd6' : 'transparent',
              }}
            >
              {isSelected && !disabled && (
                <span className="text-[0.6875rem]" style={{ color: '#0a0a1a' }}>
                  +
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
