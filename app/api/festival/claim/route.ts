export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { verifyPin, deduct, getCard, topUp } from '@/lib/server/festival-cards'
import { getChainByKey } from '@/lib/server/arc/chains'
import { resolveAddress } from '@/lib/server/ens'
import { getClearNode } from '@/lib/server/clearnode'
import { logger } from '@/lib/server/logger'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { walletId, pin, destination, targetChainKey } = body
    if (!walletId || !pin || !destination || !targetChainKey) {
      return NextResponse.json(
        { success: false, message: 'Missing walletId, pin, destination, or targetChainKey' },
        { status: 400 }
      )
    }

    // Verify PIN
    if (!verifyPin(walletId, pin)) {
      return NextResponse.json(
        { success: false, message: 'Invalid PIN' },
        { status: 401 }
      )
    }

    // Check chain
    const chainInfo = getChainByKey(targetChainKey)
    if (!chainInfo) {
      return NextResponse.json(
        { success: false, message: `Unsupported chain: ${targetChainKey}` },
        { status: 400 }
      )
    }

    // Get card balance
    const card = getCard(walletId)
    if (!card || parseFloat(card.balance) <= 0) {
      return NextResponse.json(
        { success: false, message: 'No balance to withdraw' },
        { status: 400 }
      )
    }

    const amount = card.balance

    // Resolve ENS if needed
    const resolvedDestination = await resolveAddress(destination)

    // Deduct full balance from card
    const deductResult = deduct(walletId, amount)
    if (!deductResult.success) {
      return NextResponse.json(
        { success: false, message: deductResult.message },
        { status: 400 }
      )
    }

    logger.info('Claiming NFC card via Yellow Network', {
      walletId,
      destination: resolvedDestination,
      chain: chainInfo.name,
      amount,
    })

    try {
      // Send USDC via Yellow Network
      const clearNode = getClearNode()
      await clearNode.ensureConnected()
      await clearNode.sendToWallet(resolvedDestination, amount)

      return NextResponse.json({
        success: true,
        amount,
        message: `Withdrawal complete! ${amount} USDC sent via Yellow Network`,
      })
    } catch (transferError) {
      // Transfer failed — refund the card
      topUp(walletId, amount)
      const errMsg = transferError instanceof Error ? transferError.message : String(transferError)
      logger.error('Yellow transfer failed, refunded card', { walletId, amount, error: errMsg })

      return NextResponse.json({
        success: false,
        amount: '0',
        message: `Transfer failed: ${errMsg}. Balance refunded.`,
      })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Festival claim failed', { error: message })
    return NextResponse.json({ success: false, amount: '0', message }, { status: 500 })
  }
}
