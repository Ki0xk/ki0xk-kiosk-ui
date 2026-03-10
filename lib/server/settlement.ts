import { calculateFee, type FeeBreakdown } from './arc/fees'
import { getChainByKey } from './arc/chains'
import { logger } from './logger'
import { getClearNode } from './clearnode'
import { resolveAddress } from './ens'
import * as crypto from 'crypto'
import * as fs from 'fs'

const PIN_WALLET_FILE = './pin-wallets.json'

export interface PinWallet {
  id: string
  pinHash: string
  pin?: string
  amount: string
  createdAt: number
  destination?: string
  targetChain?: string
  status: 'PENDING' | 'SETTLED' | 'FAILED'
  lastError?: string
  settledAt?: number
}

export interface SettlementResult {
  success: boolean
  message: string
}

// In-memory cache + file persistence
let _pinWallets: PinWallet[] | null = null

function loadPinWallets(): PinWallet[] {
  if (_pinWallets) return _pinWallets
  try {
    if (fs.existsSync(PIN_WALLET_FILE)) {
      _pinWallets = JSON.parse(fs.readFileSync(PIN_WALLET_FILE, 'utf-8'))
      return _pinWallets!
    }
  } catch {}
  _pinWallets = []
  return _pinWallets
}

function savePinWallets(wallets: PinWallet[]): void {
  _pinWallets = wallets
  try {
    fs.writeFileSync(PIN_WALLET_FILE, JSON.stringify(wallets, null, 2))
  } catch {}
}

function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex')
}

function generatePin(): string {
  return crypto.randomInt(100000, 1000000).toString()
}

const WALLET_ID_CHARS = '0123456789ABCD'
const WALLET_ID_LENGTH = 6

function generateWalletId(): string {
  let result = ''
  for (let i = 0; i < WALLET_ID_LENGTH; i++) {
    result += WALLET_ID_CHARS[crypto.randomInt(WALLET_ID_CHARS.length)]
  }
  return result
}

export function createPinWallet(amount: string): PinWallet & { pin: string } {
  const pin = generatePin()
  const wallet: PinWallet = {
    id: generateWalletId(),
    pinHash: hashPin(pin),
    amount,
    createdAt: Date.now(),
    status: 'PENDING',
  }

  const wallets = loadPinWallets()
  wallets.push(wallet)
  savePinWallets(wallets)

  logger.info('Created PIN wallet', { id: wallet.id, amount })
  return { ...wallet, pin }
}

export function lookupPinWallet(
  walletId: string,
  pin: string
): { success: boolean; amount: string; message: string } {
  const wallets = loadPinWallets()
  const wallet = wallets.find(
    (w) => w.id === walletId && w.status === 'PENDING'
  )

  if (!wallet) {
    return { success: false, amount: '0', message: 'Wallet not found or already claimed' }
  }

  if (hashPin(pin) !== wallet.pinHash) {
    return { success: false, amount: '0', message: 'Invalid PIN' }
  }

  return { success: true, amount: wallet.amount, message: `Wallet ${walletId} found` }
}

/**
 * Claim PIN wallet — verify PIN and send USDC via Yellow Network.
 */
export async function claimPinWallet(
  walletId: string,
  pin: string,
  destination: string,
  targetChainKey: string
): Promise<SettlementResult> {
  const wallets = loadPinWallets()
  const wallet = wallets.find(
    (w) => w.id === walletId && w.status === 'PENDING'
  )

  if (!wallet) throw new Error('Wallet not found or already claimed')
  if (hashPin(pin) !== wallet.pinHash) throw new Error('Invalid PIN')

  const chainInfo = getChainByKey(targetChainKey)
  if (!chainInfo) throw new Error(`Unsupported chain: ${targetChainKey}`)

  // Resolve ENS if needed
  const resolvedDestination = await resolveAddress(destination)

  wallet.destination = resolvedDestination
  wallet.targetChain = targetChainKey
  savePinWallets(wallets)

  const feeBreakdown = calculateFee(parseFloat(wallet.amount))

  logger.info('Claiming PIN wallet via Yellow Network', {
    walletId,
    destination: resolvedDestination,
    chain: chainInfo.name,
    amount: wallet.amount,
  })

  try {
    const clearNode = getClearNode()
    await clearNode.ensureConnected()
    await clearNode.sendToWallet(resolvedDestination, feeBreakdown.netAmount.toString())

    wallet.status = 'SETTLED'
    wallet.settledAt = Date.now()
    savePinWallets(wallets)

    return {
      success: true,
      message: `Settlement complete! ${feeBreakdown.netAmount} USDC sent via Yellow Network`,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    logger.error('Settlement failed', { walletId, error: errorMsg })

    wallet.status = 'FAILED'
    wallet.lastError = errorMsg
    savePinWallets(wallets)

    return {
      success: false,
      message: `Transfer failed: ${errorMsg}`,
    }
  }
}

export function getPendingWalletsSummary(): {
  pending: number
  settled: number
  failed: number
  totalValue: string
} {
  const wallets = loadPinWallets()
  const counts = { pending: 0, settled: 0, failed: 0 }
  let totalPendingValue = 0

  for (const w of wallets) {
    switch (w.status) {
      case 'PENDING':
        counts.pending++
        totalPendingValue += parseFloat(w.amount)
        break
      case 'SETTLED':
        counts.settled++
        break
      case 'FAILED':
        counts.failed++
        break
    }
  }

  return { ...counts, totalValue: totalPendingValue.toFixed(2) }
}
