export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { processPayment } from '@/lib/server/festival-payment'

export async function POST(request: Request) {
  try {
    const { walletId, pin, merchantId, amount } = await request.json()

    if (!walletId || !pin || !merchantId || !amount) {
      return NextResponse.json(
        { success: false, message: 'walletId, pin, merchantId, and amount are required' },
        { status: 400 }
      )
    }

    const result = await processPayment(walletId, pin, merchantId, amount)
    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
