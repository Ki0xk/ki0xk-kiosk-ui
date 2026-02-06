export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { startSession } from '@/lib/server/session'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const result = await startSession(body.userIdentifier)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
