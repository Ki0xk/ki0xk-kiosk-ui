export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import {
  createCard,
  setPin,
  getBalance,
  topUp,
  getCard,
  getSummary,
} from '@/lib/server/festival-cards'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'create': {
        const result = createCard()
        return NextResponse.json({ success: true, ...result })
      }

      case 'set-pin': {
        const { walletId, pin } = body
        if (!walletId || !pin) {
          return NextResponse.json({ success: false, message: 'walletId and pin required' }, { status: 400 })
        }
        const result = setPin(walletId, pin)
        return NextResponse.json(result)
      }

      case 'balance': {
        const { walletId } = body
        if (!walletId) {
          return NextResponse.json({ success: false, message: 'walletId required' }, { status: 400 })
        }
        const result = getBalance(walletId)
        return NextResponse.json({ success: true, ...result })
      }

      case 'topup': {
        const { walletId, amount } = body
        if (!walletId || !amount) {
          return NextResponse.json({ success: false, message: 'walletId and amount required' }, { status: 400 })
        }
        const result = topUp(walletId, amount)
        return NextResponse.json(result)
      }

      case 'info': {
        const { walletId } = body
        if (!walletId) {
          return NextResponse.json({ success: false, message: 'walletId required' }, { status: 400 })
        }
        const card = getCard(walletId)
        if (!card) {
          return NextResponse.json({ success: false, message: 'Card not found' }, { status: 404 })
        }
        return NextResponse.json({
          success: true,
          walletId: card.walletId,
          balance: card.balance,
          totalLoaded: card.totalLoaded,
          totalSpent: card.totalSpent,
          status: card.status,
          hasPin: !!card.pinHash,
        })
      }

      case 'summary': {
        const summary = getSummary()
        return NextResponse.json({ success: true, ...summary })
      }

      default:
        return NextResponse.json(
          { success: false, message: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
