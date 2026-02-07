export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getGatewayBalance } from '@/lib/server/gateway'

export async function GET() {
  try {
    const result = await getGatewayBalance()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
