import { logger } from './logger'
import { verifyPin, deduct, getBalance } from './festival-cards'
import { getMerchantById } from './merchants'
import { gatewayTransfer, gatewayMint } from './gateway'

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

  logger.info('Festival payment: card deducted, starting Gateway transfer', {
    walletId,
    merchantId,
    amount: amountUsdc,
    merchantAddress: merchant.walletAddress,
    chain: merchant.preferredChain,
  })

  // 5. Gateway transfer (burn on Arc)
  const transferResult = await gatewayTransfer(
    merchant.walletAddress,
    amountUsdc,
    merchant.preferredChain
  )

  if (!transferResult.success) {
    logger.error('Gateway transfer failed after card deduction', {
      walletId,
      error: transferResult.error,
    })
    return {
      success: false,
      newBalance: deductResult.newBalance,
      error: `Gateway transfer failed: ${transferResult.error}. Card was charged — admin can refund.`,
    }
  }

  // 6. Gateway mint (on destination chain)
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
