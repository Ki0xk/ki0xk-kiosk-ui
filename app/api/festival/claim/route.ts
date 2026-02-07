export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { verifyPin, deduct, getCard } from '@/lib/server/festival-cards'
import { bridgeToChain } from '@/lib/server/arc/bridge'
import { getChainByKey } from '@/lib/server/arc/chains'
import { resolveAddress } from '@/lib/server/ens'
import { getServerConfig } from '@/lib/server/config'
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

    logger.info('Claiming NFC card via Arc Bridge', {
      walletId,
      destination: resolvedDestination,
      chain: chainInfo.name,
      amount,
    })

    // Bridge real USDC via Arc (Circle CCTP)
    const config = getServerConfig()
    const feeRecipient = config.FEE_RECIPIENT_ADDRESS || undefined
    const bridgeResult = await bridgeToChain(
      resolvedDestination,
      targetChainKey,
      amount,
      feeRecipient
    )

    if (bridgeResult.success) {
      return NextResponse.json({
        success: true,
        amount,
        bridgeResult: {
          success: true,
          txHash: bridgeResult.txHash,
          txStatus: bridgeResult.txStatus,
          explorerUrl: bridgeResult.explorerUrl,
        },
        message: `Withdrawal complete! ${amount} USDC sent to ${chainInfo.name}`,
      })
    } else {
      // Bridge failed — refund the card
      const { topUp } = await import('@/lib/server/festival-cards')
      topUp(walletId, amount)
      logger.error('Bridge failed, refunded card', { walletId, amount, error: bridgeResult.error })

      return NextResponse.json({
        success: false,
        amount: '0',
        bridgeResult: {
          success: false,
          txHash: bridgeResult.txHash,
          txStatus: bridgeResult.txStatus,
        },
        message: `Bridge failed: ${bridgeResult.error}. Balance refunded.`,
      })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Festival claim failed', { error: message })
    return NextResponse.json({ success: false, amount: '0', message }, { status: 500 })
  }
}
