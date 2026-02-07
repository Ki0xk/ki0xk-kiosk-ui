export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getMode } from '@/lib/mode'
import { getNfcManager } from '@/lib/server/nfc'

export async function POST() {
  const mode = getMode()
  if (mode === 'demo_online') {
    return NextResponse.json(
      { success: false, message: 'NFC not available in demo_online mode' },
      { status: 501 }
    )
  }

  try {
    const nfc = getNfcManager()
    if (nfc.connected) {
      return NextResponse.json({ success: true, message: 'Already connected', reader: nfc.readerName })
    }
    await nfc.connect()
    return NextResponse.json({ success: true, message: 'NFC reader connected' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
