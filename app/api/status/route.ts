export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getMode, getModeFeatures } from '@/lib/mode'
import { getSessionSummary } from '@/lib/server/session'
import { getPendingWalletsSummary } from '@/lib/server/settlement'
import { autoFundIfNeeded } from '@/lib/server/faucet'

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

    // Auto-fund runs once per server lifetime (fire-and-forget)
    // Balances are checked inside autoFundIfNeeded only on first call;
    // use /api/faucet for on-demand balance checks
    autoFundIfNeeded().catch(() => {})

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
