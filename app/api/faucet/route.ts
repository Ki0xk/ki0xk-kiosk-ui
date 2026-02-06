export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getAllBalances, claimFaucets } from '@/lib/server/faucet'

// GET /api/faucet — check Arc + Yellow balances
export async function GET() {
  try {
    const balances = await getAllBalances()
    return NextResponse.json(balances)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/faucet — claim faucet funds + return updated balances
export async function POST() {
  try {
    const claims = await claimFaucets()

    // Brief delay for faucet processing before re-checking
    await new Promise((r) => setTimeout(r, 2000))
    const balances = await getAllBalances()

    return NextResponse.json({ claims, balances })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
