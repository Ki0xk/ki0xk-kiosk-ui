export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { depositToGateway } from '@/lib/server/gateway'

export async function POST(request: Request) {
  try {
    const { amount } = await request.json()
    if (!amount || typeof amount !== 'string') {
      return NextResponse.json({ success: false, message: 'amount required (string)' }, { status: 400 })
    }

    const result = await depositToGateway(amount)
    if (!result.success) {
      return NextResponse.json(result, { status: 500 })
    }
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
