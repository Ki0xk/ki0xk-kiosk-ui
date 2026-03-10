export const runtime = 'nodejs'

import { NextResponse } from 'next/server'

/**
 * Yellow Network handles all transfers off-chain — no gas needed
 * on destination chains. This endpoint returns all chains as having gas.
 */
export async function GET() {
  return NextResponse.json({})
}
