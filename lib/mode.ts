export type AppMode = 'demo_online' | 'demo_kiosk' | 'demo_festival'

export interface ModeFeatures {
  useSimulatedCoins: boolean
  useArduinoSerial: boolean
  useRealTransfers: boolean
  serialEnabled: boolean
  useRealNFC: boolean
}

export function getMode(): AppMode {
  const raw = process.env.NEXT_PUBLIC_MODE || 'demo_online'
  if (raw === 'demo_kiosk' || raw === 'demo_festival') return raw
  return 'demo_online'
}

export function getModeFeatures(): ModeFeatures {
  const mode = getMode()
  return {
    useSimulatedCoins: mode === 'demo_online',
    useArduinoSerial: mode === 'demo_kiosk' || mode === 'demo_festival',
    useRealTransfers: true, // always true — all modes do real ClearNode transfers
    serialEnabled: mode === 'demo_kiosk' || mode === 'demo_festival',
    useRealNFC: mode === 'demo_festival',
  }
}
