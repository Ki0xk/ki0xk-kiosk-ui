export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getMode } from '@/lib/mode'
import { getNfcManager } from '@/lib/server/nfc'

export async function POST(request: Request) {
  const mode = getMode()
  if (mode === 'demo_online') {
    return NextResponse.json(
      { success: false, message: 'NFC not available in demo_online mode' },
      { status: 501 }
    )
  }

  try {
    const { walletId } = await request.json()
    if (!walletId || typeof walletId !== 'string') {
      return NextResponse.json({ success: false, message: 'walletId required' }, { status: 400 })
    }

    const nfc = getNfcManager()
    if (!nfc.connected) {
      return NextResponse.json({ success: false, message: 'NFC reader not connected' }, { status: 503 })
    }

    const ok = await nfc.writeNdef(walletId)
    if (!ok) {
      return NextResponse.json({ success: false, message: 'Write failed — ensure card is on reader' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'NDEF written', walletId })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
