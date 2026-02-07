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
      return NextResponse.json({ success: true, readerReady: true, message: 'Already connected', reader: nfc.readerName })
    }
    await nfc.connect()
    // PC/SC initialized but reader attaches asynchronously — wait briefly for it
    await new Promise(resolve => setTimeout(resolve, 2000))
    return NextResponse.json({
      success: true,
      readerReady: nfc.connected,
      reader: nfc.readerName || null,
      message: nfc.connected ? 'NFC reader connected' : 'PC/SC initialized, waiting for reader',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, readerReady: false, message }, { status: 500 })
  }
}
