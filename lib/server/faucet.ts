import { logger } from './logger'
import { getKioskAddress } from './wallet'
import { getClearNode } from './clearnode'
import { isMainnet } from '../network'

// ============================================================================
// Types
// ============================================================================

export interface FaucetBalances {
  yellow: { asset: string; amount: string; raw: string }
  wallet: string
  timestamp: number
}

export interface FaucetClaimResult {
  yellow: { success: boolean; message: string }
}

// ============================================================================
// Balance Checking
// ============================================================================

/**
 * Parse Yellow balance from ClearNode getLedgerBalances() response.
 */
function parseYellowBalance(response: unknown): { asset: string; amount: string; raw: string } {
  const assetName = isMainnet() ? 'usdc' : 'ytest.usd'
  const fallback = { asset: assetName, amount: '0.00', raw: '0' }
  try {
    const data = response as any
    const entries = data?.params?.ledgerBalances || data?.params?.balances || []
    for (const entry of entries) {
      if (entry?.asset === assetName) {
        const rawAmount = entry?.amount || '0'
        return {
          asset: assetName,
          amount: (Number(rawAmount) / 1_000_000).toFixed(2),
          raw: rawAmount,
        }
      }
    }
  } catch (error) {
    logger.error('Failed to parse Yellow balance', { error: error as object })
  }
  return fallback
}

/**
 * Get Yellow Network balance.
 */
export async function getAllBalances(): Promise<FaucetBalances> {
  const address = getKioskAddress()

  let yellowBalance = { asset: isMainnet() ? 'usdc' : 'ytest.usd', amount: '0.00', raw: '0' }
  try {
    const clearNode = getClearNode()
    await clearNode.ensureConnected()
    const rawBalances = await clearNode.getLedgerBalances()
    yellowBalance = parseYellowBalance(rawBalances)
  } catch (error) {
    logger.warn('Could not fetch Yellow balance', {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  return {
    yellow: yellowBalance,
    wallet: address,
    timestamp: Date.now(),
  }
}

// ============================================================================
// Faucet Claims
// ============================================================================

/**
 * Claim Yellow testnet faucet (ytest.usd).
 */
async function claimYellowFaucet(address: string): Promise<{ success: boolean; message: string }> {
  if (isMainnet()) return { success: false, message: 'Faucets not available on mainnet' }
  try {
    logger.info('Requesting Yellow faucet...', { address })
    const res = await fetch('https://clearnet-sandbox.yellow.com/faucet/requestTokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userAddress: address }),
    })
    const data = await res.json().catch(() => ({}))

    if (res.ok) {
      logger.info('Yellow faucet claimed', { address })
      return { success: true, message: 'Yellow faucet tokens requested' }
    }

    const errMsg = (data as any)?.message || (data as any)?.error || `HTTP ${res.status}`
    logger.warn('Yellow faucet failed', { status: res.status, error: errMsg })
    return { success: false, message: errMsg }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error('Yellow faucet error', { error: msg })
    return { success: false, message: msg }
  }
}

/**
 * Try to claim faucets. Never throws.
 */
export async function claimFaucets(): Promise<FaucetClaimResult> {
  const address = getKioskAddress()
  const yellow = await claimYellowFaucet(address)
  return { yellow }
}

/**
 * Auto-fund if Yellow balance is below threshold.
 * Runs on startup, then repeats every 2.5 hours (faucet cooldown).
 */
const FAUCET_INTERVAL_MS = 2.5 * 60 * 60 * 1000

const globalForFaucet = globalThis as unknown as {
  __autoFundStarted?: boolean
}

export async function autoFundIfNeeded(): Promise<void> {
  if (globalForFaucet.__autoFundStarted) return
  globalForFaucet.__autoFundStarted = true

  await runFaucetCheck()
  setInterval(() => {
    runFaucetCheck().catch(() => {})
  }, FAUCET_INTERVAL_MS)
}

async function runFaucetCheck(): Promise<void> {
  try {
    const balances = await getAllBalances()
    const yellowAmount = parseFloat(balances.yellow.amount)

    if (yellowAmount >= 1.0) {
      logger.info('Yellow balance OK, skipping faucet', {
        yellow: balances.yellow.amount,
      })
    } else {
      logger.info('Low Yellow balance, attempting faucet claim', {
        yellow: balances.yellow.amount,
      })
      const address = getKioskAddress()
      await claimYellowFaucet(address)
    }
  } catch (error) {
    logger.warn('Auto-fund check failed (non-fatal)', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
