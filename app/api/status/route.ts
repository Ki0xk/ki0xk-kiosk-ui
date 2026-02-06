export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getMode, getModeFeatures } from '@/lib/mode'
import { getSessionSummary } from '@/lib/server/session'
import { getPendingWalletsSummary } from '@/lib/server/settlement'

export async function GET() {
  try {
    const mode = getMode()
    const features = getModeFeatures()

    let serial = undefined
    if (features.serialEnabled) {
      try {
        const { getSerialManager } = await import('@/lib/server/serial')
        const mgr = getSerialManager()
        serial = { connected: mgr.connected }
      } catch {
        serial = { connected: false }
      }
    }

    let wallet = undefined
    try {
      const { getWalletInfo } = await import('@/lib/server/wallet')
      wallet = await getWalletInfo()
    } catch (error) {
      wallet = { error: error instanceof Error ? error.message : 'Failed to get wallet info' }
    }

    return NextResponse.json({
      mode,
      features,
      wallet,
      serial,
      sessions: getSessionSummary(),
      pinWallets: getPendingWalletsSummary(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
