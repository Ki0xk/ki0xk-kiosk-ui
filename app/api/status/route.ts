export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getMode, getModeFeatures } from '@/lib/mode'
import { getSessionSummary } from '@/lib/server/session'
import { getPendingWalletsSummary } from '@/lib/server/settlement'
import { autoFundIfNeeded, getAllBalances } from '@/lib/server/faucet'

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

    // Auto-fund on first status check (fire-and-forget)
    autoFundIfNeeded().catch(() => {})

    let balances = undefined
    try {
      balances = await getAllBalances()
    } catch {
      balances = { error: 'Failed to fetch balances' }
    }

    return NextResponse.json({
      mode,
      features,
      wallet,
      balances,
      serial,
      sessions: getSessionSummary(),
      pinWallets: getPendingWalletsSummary(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
