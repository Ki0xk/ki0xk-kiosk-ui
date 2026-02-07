export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getMode } from '@/lib/mode'
import { getNfcManager } from '@/lib/server/nfc'

export async function GET() {
  const mode = getMode()
  if (mode === 'demo_online') {
    return NextResponse.json(
      { success: false, message: 'NFC not available in demo_online mode' },
      { status: 501 }
    )
  }

  const nfc = getNfcManager()

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          clearInterval(heartbeat)
        }
      }, 15000)

      const unsubscribe = nfc.subscribe((event) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          unsubscribe()
          clearInterval(heartbeat)
        }
      })

      ;(controller as any)._cleanup = () => {
        unsubscribe()
        clearInterval(heartbeat)
      }
    },
    cancel() {},
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
