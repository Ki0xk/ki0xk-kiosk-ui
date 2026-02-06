export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { endSession } from '@/lib/server/session'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sessionId, destinationAddress, targetChainKey } = body
    if (!sessionId || !destinationAddress || !targetChainKey) {
      return NextResponse.json(
        { success: false, message: 'Missing sessionId, destinationAddress, or targetChainKey' },
        { status: 400 }
      )
    }
    const result = await endSession(sessionId, destinationAddress, targetChainKey)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
