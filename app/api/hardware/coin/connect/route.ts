export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getMode } from '@/lib/mode'
import { getSerialManager } from '@/lib/server/serial'

export async function POST() {
  const mode = getMode()
  if (mode === 'demo_online') {
    return NextResponse.json(
      { success: false, message: 'Serial not available in demo_online mode' },
      { status: 501 }
    )
  }

  try {
    const serial = getSerialManager()
    if (serial.connected) {
      return NextResponse.json({ success: true, message: 'Already connected' })
    }
    await serial.connect()
    return NextResponse.json({ success: true, message: 'Serial port connected' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
