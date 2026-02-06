import { getClearNode } from './clearnode'
import { bridgeToChain, getArcBalance, type BridgeResult } from './arc/bridge'
import { calculateFee, type FeeBreakdown } from './arc/fees'
import { getChainByKey } from './arc/chains'
import { logger } from './logger'
import { getServerConfig } from './config'
import { getKioskAddress } from './wallet'
import * as crypto from 'crypto'
import * as fs from 'fs'

const YTEST_USD_TOKEN = '0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb'
const BASE_SEPOLIA_CHAIN_ID = 84532
const PIN_WALLET_FILE = './pin-wallets.json'

export interface PinWallet {
  id: string
  pinHash: string
  pin?: string
  amount: string
  createdAt: number
  destination?: string
  targetChain?: string
  status: 'PENDING' | 'PENDING_BRIDGE' | 'SETTLED' | 'FAILED'
  bridgeAttempts: number
  lastBridgeError?: string
  lastBridgeAttempt?: number
  bridgeTxHash?: string
  settledAt?: number
}

export interface SettlementResult {
  success: boolean
  yellowRecorded: boolean
  bridgeResult?: BridgeResult
  fallbackPin?: string
  fallbackId?: string
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
    bridgeAttempts: 0,
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
    (w) => w.id === walletId && (w.status === 'PENDING' || w.status === 'PENDING_BRIDGE')
  )

  if (!wallet) {
    return { success: false, amount: '0', message: 'Wallet not found or already claimed' }
  }

  if (hashPin(pin) !== wallet.pinHash) {
    return { success: false, amount: '0', message: 'Invalid PIN' }
  }

  return { success: true, amount: wallet.amount, message: `Wallet ${walletId} found` }
}

export async function claimPinWallet(
  walletId: string,
  pin: string,
  destination: string,
  targetChainKey: string
): Promise<SettlementResult> {
  const wallets = loadPinWallets()
  const wallet = wallets.find(
    (w) => w.id === walletId && (w.status === 'PENDING' || w.status === 'PENDING_BRIDGE')
  )

  if (!wallet) throw new Error('Wallet not found or already claimed')
  if (hashPin(pin) !== wallet.pinHash) throw new Error('Invalid PIN')

  const chainInfo = getChainByKey(targetChainKey)
  if (!chainInfo) throw new Error(`Unsupported chain: ${targetChainKey}`)

  wallet.destination = destination
  wallet.targetChain = targetChainKey
  savePinWallets(wallets)

  const feeBreakdown = calculateFee(parseFloat(wallet.amount))

  logger.info('Claiming PIN wallet with channel settlement', {
    walletId,
    destination,
    chain: chainInfo.name,
    amount: wallet.amount,
  })

  let channelId: string | null = null

  try {
    const clearNode = getClearNode()
    await clearNode.ensureConnected()

    logger.info('Opening Yellow channel for settlement...')
    channelId = await clearNode.createChannel(YTEST_USD_TOKEN, BASE_SEPOLIA_CHAIN_ID)
    logger.info('Channel opened', { channelId })

    logger.info('Bridging via Arc...', { destination, chain: chainInfo.name })
    const config = getServerConfig()
    const feeRecipient = config.FEE_RECIPIENT_ADDRESS || undefined
    const bridgeResult = await bridgeToChain(
      destination,
      targetChainKey,
      wallet.amount,
      feeRecipient
    )

    if (channelId) {
      const exists = await clearNode.channelExists(channelId)
      if (exists) {
        try {
          await clearNode.closeChannel(channelId, getKioskAddress())
        } catch {}
      }
    }

    if (bridgeResult.success) {
      wallet.status = 'SETTLED'
      wallet.bridgeTxHash = bridgeResult.txHash
      wallet.settledAt = Date.now()
      savePinWallets(wallets)

      return {
        success: true,
        yellowRecorded: true,
        bridgeResult,
        message: `Settlement complete! ${feeBreakdown.netAmount} USDC sent to ${chainInfo.name}`,
      }
    } else {
      wallet.status = 'PENDING_BRIDGE'
      wallet.bridgeAttempts++
      wallet.lastBridgeError = bridgeResult.error
      wallet.lastBridgeAttempt = Date.now()
      savePinWallets(wallets)

      return {
        success: false,
        yellowRecorded: true,
        bridgeResult,
        message: `Bridge failed: ${bridgeResult.error}. PIN still valid for retry.`,
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    logger.error('Settlement failed', { walletId, error: errorMsg })

    if (channelId) {
      try {
        const clearNode = getClearNode()
        await clearNode.closeChannel(channelId, getKioskAddress())
      } catch {}
    }

    wallet.status = 'PENDING_BRIDGE'
    wallet.bridgeAttempts++
    wallet.lastBridgeError = errorMsg
    wallet.lastBridgeAttempt = Date.now()
    savePinWallets(wallets)

    return {
      success: false,
      yellowRecorded: false,
      message: `Settlement failed: ${errorMsg}. PIN still valid for retry.`,
    }
  }
}

export function getPendingWalletsSummary(): {
  pending: number
  pendingBridge: number
  settled: number
  failed: number
  totalValue: string
} {
  const wallets = loadPinWallets()
  const counts = { pending: 0, pendingBridge: 0, settled: 0, failed: 0 }
  let totalPendingValue = 0

  for (const w of wallets) {
    switch (w.status) {
      case 'PENDING':
        counts.pending++
        totalPendingValue += parseFloat(w.amount)
        break
      case 'PENDING_BRIDGE':
        counts.pendingBridge++
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
