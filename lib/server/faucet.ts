import { logger } from './logger'
import { getServerConfig } from './config'
import { getKioskAddress } from './wallet'
import { getArcBalance } from './arc/bridge'
import { getClearNode } from './clearnode'
import { getMode } from '../mode'

// ============================================================================
// Types
// ============================================================================

export interface FaucetBalances {
  arc: { usdc: string; usdcRaw: string }
  yellow: { asset: string; amount: string; raw: string }
  wallet: string
  timestamp: number
}

export interface FaucetClaimResult {
  yellow: { success: boolean; message: string }
  circle: { success: boolean; message: string }
}

// ============================================================================
// Balance Checking
// ============================================================================

/**
 * Parse Yellow ytest.usd balance from ClearNode getLedgerBalances() response.
 * Exact logic from kiosk/src/settlement.ts lines 93-107.
 */
function parseYellowBalance(response: unknown): { asset: string; amount: string; raw: string } {
  const fallback = { asset: 'ytest.usd', amount: '0.00', raw: '0' }
  try {
    const data = response as any
    const entries = data?.params?.ledgerBalances || data?.params?.balances || []
    for (const entry of entries) {
      if (entry?.asset === 'ytest.usd') {
        const rawAmount = entry?.amount || '0'
        return {
          asset: 'ytest.usd',
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
 * Get all balances: Arc USDC + Yellow ytest.usd.
 */
export async function getAllBalances(): Promise<FaucetBalances> {
  const address = getKioskAddress()

  const arcBalance = await getArcBalance()

  let yellowBalance = { asset: 'ytest.usd', amount: '0.00', raw: '0' }
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
    arc: { usdc: arcBalance.usdc, usdcRaw: arcBalance.usdcRaw.toString() },
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
 * No API key needed.
 */
async function claimYellowFaucet(address: string): Promise<{ success: boolean; message: string }> {
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
 * Claim Circle/Arc testnet faucet (USDC on Arc Testnet).
 * Uses POST /v1/faucet/drips with TEST_API_KEY auth.
 * Skips if CIRCLE_API_KEY is not set.
 */
async function claimCircleFaucet(address: string): Promise<{ success: boolean; message: string }> {
  const config = getServerConfig()
  if (!config.CIRCLE_API_KEY) {
    return { success: false, message: 'CIRCLE_API_KEY not set, skipping Arc faucet' }
  }

  try {
    logger.info('Requesting Circle faucet (Arc USDC)...', { address })
    const res = await fetch('https://api.circle.com/v1/faucet/drips', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${config.CIRCLE_API_KEY}`,
      },
      body: JSON.stringify({
        address,
        blockchain: 'ARC-TESTNET',
        native: false,
        usdc: true,
      }),
    })
    const data = await res.json().catch(() => ({}))

    if (res.ok) {
      logger.info('Circle faucet claimed', { address, data: data as object })
      return { success: true, message: 'Circle faucet USDC requested on Arc Testnet' }
    }

    const errMsg = (data as any)?.message || (data as any)?.error || `HTTP ${res.status}`
    logger.warn('Circle faucet failed', { status: res.status, error: errMsg })
    return { success: false, message: errMsg }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error('Circle faucet error', { error: msg })
    return { success: false, message: msg }
  }
}

/**
 * Try to claim both faucets in parallel. Never throws.
 */
export async function claimFaucets(): Promise<FaucetClaimResult> {
  const address = getKioskAddress()
  const [yellow, circle] = await Promise.all([
    claimYellowFaucet(address),
    claimCircleFaucet(address),
  ])
  return { yellow, circle }
}

/**
 * Auto-fund if balances are below thresholds.
 * Runs on startup, then repeats every 2.5 hours (faucet cooldown).
 * Silent — never throws.
 */
const FAUCET_INTERVAL_MS = 2.5 * 60 * 60 * 1000 // 2.5 hours

const globalForFaucet = globalThis as unknown as {
  __autoFundStarted?: boolean
}

export async function autoFundIfNeeded(): Promise<void> {
  if (globalForFaucet.__autoFundStarted) return
  globalForFaucet.__autoFundStarted = true

  // Run immediately, then schedule recurring
  await runFaucetCheck()
  setInterval(() => {
    runFaucetCheck().catch(() => {})
  }, FAUCET_INTERVAL_MS)
}

async function runFaucetCheck(): Promise<void> {
  try {
    const balances = await getAllBalances()
    const arcAmount = parseFloat(balances.arc.usdc)
    const yellowAmount = parseFloat(balances.yellow.amount)

    if (arcAmount >= 1.0 && yellowAmount >= 1.0) {
      logger.info('Balances OK, skipping faucet', {
        arc: balances.arc.usdc,
        yellow: balances.yellow.amount,
      })
    } else {
      logger.info('Low balance detected, attempting faucet claims', {
        arc: balances.arc.usdc,
        yellow: balances.yellow.amount,
      })

      const address = getKioskAddress()
      const promises: Promise<unknown>[] = []
      if (yellowAmount < 1.0) promises.push(claimYellowFaucet(address))
      if (arcAmount < 1.0) promises.push(claimCircleFaucet(address))
      await Promise.allSettled(promises)
    }

    // Auto-fund Gateway for festival mode (deposit 1 USDC if empty)
    if (getMode() === 'demo_festival') {
      try {
        const { ensureGatewayBalance } = await import('./gateway')
        await ensureGatewayBalance('1')
      } catch (gwErr) {
        logger.warn('Gateway auto-fund failed (non-fatal)', {
          error: gwErr instanceof Error ? gwErr.message : String(gwErr),
        })
      }
    }
  } catch (error) {
    logger.warn('Auto-fund check failed (non-fatal)', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
