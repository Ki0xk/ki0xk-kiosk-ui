export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { claimPinWallet } from '@/lib/server/settlement'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { walletId, pin, destination, targetChainKey } = body
    if (!walletId || !pin || !destination || !targetChainKey) {
      return NextResponse.json(
        { success: false, message: 'Missing walletId, pin, destination, or targetChainKey' },
        { status: 400 }
      )
    }
    const result = await claimPinWallet(walletId, pin, destination, targetChainKey)
    return NextResponse.json({
      success: result.success,
      amount: result.bridgeResult?.amount || '0',
      bridgeResult: result.bridgeResult
        ? {
            success: result.bridgeResult.success,
            txHash: result.bridgeResult.txHash,
            txStatus: result.bridgeResult.txStatus,
          }
        : undefined,
      message: result.message,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, amount: '0', message }, { status: 500 })
  }
}
