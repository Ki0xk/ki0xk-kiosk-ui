export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getModeFeatures } from '@/lib/mode'

/**
 * Lightweight hardware status endpoint.
 * Only checks serial + NFC connected booleans — no ClearNode, no balance fetching.
 */
export async function GET() {
  const features = getModeFeatures()

  let serial = { connected: false }
  if (features.serialEnabled) {
    try {
      const { getSerialManager } = await import('@/lib/server/serial')
      const mgr = getSerialManager()
      serial = { connected: mgr.connected }
    } catch {}
  }

  let nfc = { connected: false }
  if (features.useRealNFC) {
    try {
      const { getNfcManager } = await import('@/lib/server/nfc')
      const mgr = getNfcManager()
      nfc = { connected: mgr.connected }
    } catch {}
  }

  return NextResponse.json({ serial, nfc })
}
