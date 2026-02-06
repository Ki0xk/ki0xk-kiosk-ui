export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { lookupPinWallet } from '@/lib/server/settlement'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { walletId, pin } = body
    if (!walletId || !pin) {
      return NextResponse.json(
        { success: false, amount: '0', message: 'Missing walletId or pin' },
        { status: 400 }
      )
    }
    const result = lookupPinWallet(walletId, pin)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, amount: '0', message }, { status: 500 })
  }
}
