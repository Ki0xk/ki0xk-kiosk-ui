export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getMode } from '@/lib/mode'
import { getSerialManager } from '@/lib/server/serial'

export async function GET() {
  const mode = getMode()
  if (mode === 'demo_online') {
    return NextResponse.json(
      { success: false, message: 'Serial not available in demo_online mode' },
      { status: 501 }
    )
  }

  const serial = getSerialManager()

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      // Send heartbeat every 15s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          clearInterval(heartbeat)
        }
      }, 15000)

      const unsubscribe = serial.subscribe((event) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          unsubscribe()
          clearInterval(heartbeat)
        }
      })

      // Clean up on close
      const originalCancel = controller.close.bind(controller)
      ;(controller as any)._cleanup = () => {
        unsubscribe()
        clearInterval(heartbeat)
      }
    },
    cancel() {
      // Clean up is handled by the subscription and interval
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
