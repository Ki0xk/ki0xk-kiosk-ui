// ============================================================================
// Network configuration — single toggle for testnet vs mainnet
// Reads NEXT_PUBLIC_NETWORK env var (available on both client and server)
// ============================================================================

export type NetworkMode = 'testnet' | 'mainnet'

let _cached: NetworkMode | null = null

export function getNetwork(): NetworkMode {
  if (_cached) return _cached
  const raw = typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_NETWORK : undefined
  _cached = raw === 'mainnet' ? 'mainnet' : 'testnet'
  return _cached
}

export function isMainnet(): boolean {
  return getNetwork() === 'mainnet'
}
