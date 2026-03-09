import { logger } from './logger'
import { verifyPin, deduct, topUp, getBalance } from './festival-cards'
import { getMerchantById } from './merchants'

export interface FestivalPaymentResult {
  success: boolean
  txHash?: string
  explorerUrl?: string
  newBalance?: string
  method?: 'yellow' | 'gateway'
  error?: string
}

/**
 * Get the configured payment method for festival mode.
 * 'yellow' = instant off-chain via Yellow Network transfer (recommended)
 * 'gateway' = on-chain via Circle Gateway burn+mint (legacy)
 */
function getPaymentMethod(): 'yellow' | 'gateway' {
  const method = process.env.FESTIVAL_PAYMENT_METHOD || 'yellow'
  return method === 'gateway' ? 'gateway' : 'yellow'
}

/**
 * Process a festival payment: verify PIN → deduct card → pay merchant.
 * Uses Yellow Network transfer (instant, gasless) by default.
 * Falls back to Circle Gateway if FESTIVAL_PAYMENT_METHOD=gateway.
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

  const method = getPaymentMethod()

  if (method === 'yellow') {
    return processYellowPayment(walletId, merchantId, merchant.walletAddress, amountUsdc, deductResult.newBalance)
  } else {
    return processGatewayPayment(walletId, merchantId, merchant.walletAddress, merchant.preferredChain, amountUsdc, deductResult.newBalance)
  }
}

/**
 * Pay merchant via Yellow Network off-chain transfer.
 * Instant, gasless. Merchant receives USDC in their Yellow unified balance.
 */
async function processYellowPayment(
  walletId: string,
  merchantId: string,
  merchantAddress: string,
  amountUsdc: string,
  newBalance?: string
): Promise<FestivalPaymentResult> {
  logger.info('Festival payment via Yellow transfer', {
    walletId,
    merchantId,
    merchantAddress,
    amount: amountUsdc,
  })

  try {
    const { getClearNode } = await import('./clearnode')
    const clearNode = getClearNode()
    await clearNode.ensureConnected()
    await clearNode.sendToWallet(merchantAddress, amountUsdc)

    logger.info('Festival payment complete (Yellow transfer)', {
      walletId,
      merchantId,
      amount: amountUsdc,
    })

    return {
      success: true,
      newBalance,
      method: 'yellow',
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
      method: 'yellow',
      error: `Yellow transfer failed: ${errorMsg}`,
    }
  }
}

/**
 * Pay merchant via Circle Gateway (on-chain burn+mint).
 * Slower (~30s), requires gas, but delivers real on-chain USDC.
 */
async function processGatewayPayment(
  walletId: string,
  merchantId: string,
  merchantAddress: string,
  preferredChain: string,
  amountUsdc: string,
  newBalance?: string
): Promise<FestivalPaymentResult> {
  const { gatewayTransfer, gatewayMint, ensureGatewayBalance } = await import('./gateway')

  logger.info('Festival payment via Gateway', {
    walletId,
    merchantId,
    merchantAddress,
    chain: preferredChain,
    amount: amountUsdc,
  })

  // Ensure Gateway has enough balance (just-in-time deposit)
  const feeBuffer = 0.01
  const requiredGateway = (parseFloat(amountUsdc) + feeBuffer).toFixed(6)
  const fundResult = await ensureGatewayBalance(requiredGateway)
  if (!fundResult.success) {
    logger.error('Gateway funding failed, refunding card', { walletId, error: fundResult.error })
    const refund = topUp(walletId, amountUsdc)
    return {
      success: false,
      newBalance: refund.newBalance,
      method: 'gateway',
      error: `Gateway funding failed: ${fundResult.error}`,
    }
  }

  // Gateway transfer (burn on Arc/Base)
  const transferResult = await gatewayTransfer(merchantAddress, amountUsdc, preferredChain)
  if (!transferResult.success) {
    logger.error('Gateway transfer failed, refunding card', { walletId, error: transferResult.error })
    const refund = topUp(walletId, amountUsdc)
    return {
      success: false,
      newBalance: refund.newBalance,
      method: 'gateway',
      error: `Gateway transfer failed: ${transferResult.error}`,
    }
  }

  // Gateway mint (on destination chain)
  const mintResult = await gatewayMint(transferResult.attestation!, transferResult.signature!, preferredChain)
  if (!mintResult.success) {
    return {
      success: false,
      newBalance,
      method: 'gateway',
      error: `Gateway mint failed: ${mintResult.error}. Transfer was submitted — may complete later.`,
    }
  }

  logger.info('Festival payment complete (Gateway)', {
    walletId,
    merchantId,
    txHash: mintResult.txHash,
  })

  return {
    success: true,
    txHash: mintResult.txHash,
    explorerUrl: mintResult.explorerUrl,
    newBalance,
    method: 'gateway',
  }
}
