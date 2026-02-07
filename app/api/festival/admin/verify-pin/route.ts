export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getServerConfig } from '@/lib/server/config'

export async function POST(request: Request) {
  try {
    const { pin } = await request.json()
    if (!pin || typeof pin !== 'string') {
      return NextResponse.json({ success: false, message: 'PIN required' }, { status: 400 })
    }

    const config = getServerConfig()
    if (pin !== config.FESTIVAL_ADMIN_PIN) {
      return NextResponse.json({ success: false, message: 'Invalid admin PIN' }, { status: 401 })
    }

    return NextResponse.json({ success: true, message: 'Admin authenticated' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
