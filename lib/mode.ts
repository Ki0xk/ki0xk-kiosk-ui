export type AppMode = 'online' | 'kiosk' | 'festival'

export interface ModeFeatures {
  useSimulatedCoins: boolean
  useArduinoSerial: boolean
  useRealTransfers: boolean
  serialEnabled: boolean
  useRealNFC: boolean
  useRealGateway: boolean
}

export function getMode(): AppMode {
  const raw = process.env.NEXT_PUBLIC_MODE || 'online'
  if (raw === 'kiosk' || raw === 'festival') return raw
  return 'online'
}

export function getModeFeatures(): ModeFeatures {
  const mode = getMode()
  return {
    useSimulatedCoins: mode === 'online',
    useArduinoSerial: mode === 'kiosk' || mode === 'festival',
    useRealTransfers: true, // always true — all modes do real ClearNode transfers
    serialEnabled: mode === 'kiosk' || mode === 'festival',
    useRealNFC: mode === 'festival' || mode === 'kiosk',
    useRealGateway: mode === 'festival',
  }
}
