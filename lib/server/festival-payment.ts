import { logger } from './logger'
import { verifyPin, deduct, topUp, getBalance } from './festival-cards'
import { getMerchantById } from './merchants'

export interface FestivalPaymentResult {
  success: boolean
  newBalance?: string
  error?: string
}

/**
 * Process a festival payment: verify PIN → deduct card → pay merchant via Yellow Network.
 */
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

  // 5. Send via Yellow Network
  logger.info('Festival payment via Yellow transfer', {
    walletId,
    merchantId,
    merchantAddress: merchant.walletAddress,
    amount: amountUsdc,
  })

  try {
    const { getClearNode } = await import('./clearnode')
    const clearNode = getClearNode()
    await clearNode.ensureConnected()
    await clearNode.sendToWallet(merchant.walletAddress, amountUsdc)

    logger.info('Festival payment complete (Yellow transfer)', {
      walletId,
      merchantId,
      amount: amountUsdc,
    })

    return {
      success: true,
      newBalance: deductResult.newBalance,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    logger.error('Yellow transfer failed, refunding card', {
      walletId,
      amount: amountUsdc,
      error: errorMsg,
    })
    const refund = topUp(walletId, amountUsdc)
    return {
      success: false,
      newBalance: refund.newBalance,
      error: `Transfer failed: ${errorMsg}`,
    }
  }
}
