import { logger } from './logger'
import { verifyPin, deduct, topUp, getBalance } from './festival-cards'
import { getMerchantById } from './merchants'
import { gatewayTransfer, gatewayMint, ensureGatewayBalance } from './gateway'

export interface FestivalPaymentResult {
  success: boolean
  txHash?: string
  explorerUrl?: string
  newBalance?: string
  error?: string
}

export async function processPayment(
  walletId: string,
  pin: string,
  merchantId: string,
  amountUsdc: string
): Promise<FestivalPaymentResult> {
  // 1. Verify PIN
  if (!verifyPin(walletId, pin)) {
    return { success: false, error: 'Invalid PIN' }
  }

  // 2. Look up merchant
  const merchant = getMerchantById(merchantId)
  if (!merchant) {
    return { success: false, error: `Merchant not found: ${merchantId}` }
  }

  // 3. Check balance
  const balInfo = getBalance(walletId)
  if (!balInfo.exists) {
    return { success: false, error: 'Card not found' }
  }
  if (parseFloat(balInfo.balance) < parseFloat(amountUsdc)) {
    return { success: false, error: 'Insufficient balance' }
  }

  // 4. Deduct from card
  const deductResult = deduct(walletId, amountUsdc)
  if (!deductResult.success) {
    return { success: false, error: deductResult.message }
  }

  logger.info('Festival payment: card deducted, ensuring Gateway balance', {
    walletId,
    merchantId,
    amount: amountUsdc,
    merchantAddress: merchant.walletAddress,
    chain: merchant.preferredChain,
  })

  // 5. Ensure Gateway has enough balance (just-in-time deposit)
  const feeBuffer = 0.01 // covers gas + 0.005% fee on testnet
  const requiredGateway = (parseFloat(amountUsdc) + feeBuffer).toFixed(6)
  const fundResult = await ensureGatewayBalance(requiredGateway)
  if (!fundResult.success) {
    logger.error('Gateway funding failed, refunding card', {
      walletId,
      amount: amountUsdc,
      error: fundResult.error,
    })
    const refund = topUp(walletId, amountUsdc)
    return {
      success: false,
      newBalance: refund.newBalance,
      error: `Gateway funding failed: ${fundResult.error}`,
    }
  }

  // 6. Gateway transfer (burn on Arc)
  const transferResult = await gatewayTransfer(
    merchant.walletAddress,
    amountUsdc,
    merchant.preferredChain
  )

  if (!transferResult.success) {
    logger.error('Gateway transfer failed, refunding card', {
      walletId,
      amount: amountUsdc,
      error: transferResult.error,
    })
    // Auto-refund the card
    const refund = topUp(walletId, amountUsdc)
    logger.info('Card refunded after Gateway failure', {
      walletId,
      refundedAmount: amountUsdc,
      newBalance: refund.newBalance,
    })
    return {
      success: false,
      newBalance: refund.newBalance,
      error: `Gateway transfer failed: ${transferResult.error}`,
    }
  }

  // 7. Gateway mint (on destination chain)
  const mintResult = await gatewayMint(
    transferResult.attestation!,
    transferResult.signature!,
    merchant.preferredChain
  )

  if (!mintResult.success) {
    logger.error('Gateway mint failed after transfer', {
      walletId,
      error: mintResult.error,
    })
    return {
      success: false,
      newBalance: deductResult.newBalance,
      error: `Gateway mint failed: ${mintResult.error}. Transfer was submitted — may complete later.`,
    }
  }

  logger.info('Festival payment complete', {
    walletId,
    merchantId,
    txHash: mintResult.txHash,
  })

  return {
    success: true,
    txHash: mintResult.txHash,
    explorerUrl: mintResult.explorerUrl,
    newBalance: deductResult.newBalance,
  }
}
