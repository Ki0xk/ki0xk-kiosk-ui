export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getMerchants } from '@/lib/server/merchants'

export async function GET() {
  try {
    const merchants = getMerchants()
    return NextResponse.json({ success: true, merchants })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
