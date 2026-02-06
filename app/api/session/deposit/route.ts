export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { depositToSession } from '@/lib/server/session'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sessionId, amount } = body
    if (!sessionId || !amount) {
      return NextResponse.json(
        { success: false, message: 'Missing sessionId or amount' },
        { status: 400 }
      )
    }
    const result = await depositToSession(sessionId, amount)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
