import { bridgeToChain } from './arc/bridge'
import { calculateFee, type FeeBreakdown } from './arc/fees'
import { getChainByKey } from './arc/chains'
import { createPinWallet } from './settlement'
import { logger } from './logger'
import { getServerConfig } from './config'
import { resolveAddress } from './ens'
import * as crypto from 'crypto'
import * as fs from 'fs'

const SESSION_FILE = './sessions.json'

export interface KioskSession {
  id: string
  userIdentifier?: string
  totalDeposited: string
  currentBalance: string
  startedAt: number
  lastActivityAt: number
  endedAt?: number
  status: 'ACTIVE' | 'SETTLING' | 'SETTLED' | 'FAILED'
  destinationAddress?: string
  destinationChain?: string
  bridgeTxHash?: string
  explorerUrl?: string
  fee?: FeeBreakdown
  error?: string
}

export interface SessionStartResult {
  success: boolean
  sessionId: string
  message: string
}

export interface SessionDepositResult {
  success: boolean
  newBalance: string
  totalDeposited: string
  message: string
}

export interface SessionEndResult {
  success: boolean
  settledAmount: string
  fee: FeeBreakdown
  bridgeTxHash?: string
  explorerUrl?: string
  destinationChain: string
  message: string
}

export interface SessionPinResult {
  success: boolean
  pin: string
  walletId: string
  amount: string
  message: string
}

// In-memory cache + file persistence
let _sessions: KioskSession[] | null = null

function loadSessions(): KioskSession[] {
  if (_sessions) return _sessions
  try {
    if (fs.existsSync(SESSION_FILE)) {
      _sessions = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'))
      return _sessions!
    }
  } catch {}
  _sessions = []
  return _sessions
}

function saveSessions(sessions: KioskSession[]): void {
  _sessions = sessions
  try {
    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2))
  } catch {}
}

function generateSessionId(): string {
  return 'S' + crypto.randomBytes(4).toString('hex').toUpperCase()
}

/**
 * Start a new kiosk session.
 *
 * For ATM operation we do NOT create Yellow channels.
 * Settlement uses Arc Bridge (Circle CCTP) to deliver real USDC on-chain.
 * We just create a local session record.
 */
export async function startSession(userIdentifier?: string): Promise<SessionStartResult> {
  const sessionId = generateSessionId()
  logger.info('Starting new kiosk session', { sessionId, userIdentifier })

  const session: KioskSession = {
    id: sessionId,
    userIdentifier,
    totalDeposited: '0',
    currentBalance: '0',
    startedAt: Date.now(),
    lastActivityAt: Date.now(),
    status: 'ACTIVE',
  }

  const sessions = loadSessions()
  sessions.push(session)
  saveSessions(sessions)

  return {
    success: true,
    sessionId,
    message: `Session ${sessionId} started. Ready for coin deposits.`,
  }
}

/**
 * Add funds to an active session (user inserted cash).
 *
 * This is purely local balance tracking.
 * The kiosk operator has pre-funded USDC on Arc Testnet.
 */
export async function depositToSession(
  sessionId: string,
  amount: string
): Promise<SessionDepositResult> {
  const sessions = loadSessions()
  const session = sessions.find((s) => s.id === sessionId && s.status === 'ACTIVE')
  if (!session) throw new Error(`Session ${sessionId} not found or not active`)

  const depositAmount = parseFloat(amount)
  if (isNaN(depositAmount) || depositAmount <= 0) {
    throw new Error(`Invalid deposit amount: ${amount}`)
  }

  logger.info('Processing cash deposit', { sessionId, amount })

  const currentBalance = parseFloat(session.currentBalance)
  const totalDeposited = parseFloat(session.totalDeposited)
  session.currentBalance = (currentBalance + depositAmount).toFixed(2)
  session.totalDeposited = (totalDeposited + depositAmount).toFixed(2)
  session.lastActivityAt = Date.now()
  saveSessions(sessions)

  return {
    success: true,
    newBalance: session.currentBalance,
    totalDeposited: session.totalDeposited,
    message: `Deposited ${amount} USDC. Session balance: ${session.currentBalance}`,
  }
}

/**
 * End session and bridge real USDC to destination via Arc (Circle CCTP).
 *
 * This is the original kiosk flow:
 * 1. Resolve ENS name to hex address (if needed)
 * 2. Bridge USDC from Arc Testnet to user's chosen chain
 * 3. Return explorer URL + txHash for verification
 */
export async function endSession(
  sessionId: string,
  destinationAddress: string,
  targetChainKey: string
): Promise<SessionEndResult> {
  const sessions = loadSessions()
  const session = sessions.find((s) => s.id === sessionId && s.status === 'ACTIVE')
  if (!session) throw new Error(`Session ${sessionId} not found or not active`)

  const chainInfo = getChainByKey(targetChainKey)
  if (!chainInfo) throw new Error(`Unsupported chain: ${targetChainKey}`)

  const settleAmount = parseFloat(session.currentBalance)
  if (settleAmount <= 0) throw new Error('No balance to settle')

  const feeBreakdown = calculateFee(settleAmount)

  // Resolve ENS name to hex address if needed
  const resolvedAddress = await resolveAddress(destinationAddress)

  logger.info('Ending session', {
    sessionId,
    destination: resolvedAddress,
    originalInput: destinationAddress !== resolvedAddress ? destinationAddress : undefined,
    chain: chainInfo.name,
    amount: session.currentBalance,
    fee: feeBreakdown.fee,
  })

  session.status = 'SETTLING'
  session.destinationAddress = resolvedAddress
  session.destinationChain = targetChainKey
  session.fee = feeBreakdown
  saveSessions(sessions)

  try {
    // Bridge real USDC via Arc (Circle CCTP) — matches original kiosk flow
    const config = getServerConfig()
    const feeRecipient = config.FEE_RECIPIENT_ADDRESS || undefined
    const bridgeResult = await bridgeToChain(
      resolvedAddress,
      targetChainKey,
      session.currentBalance,
      feeRecipient
    )

    if (bridgeResult.success) {
      session.status = 'SETTLED'
      session.bridgeTxHash = bridgeResult.txHash
      session.explorerUrl = bridgeResult.explorerUrl
      session.endedAt = Date.now()
      saveSessions(sessions)

      return {
        success: true,
        settledAmount: feeBreakdown.netAmount.toString(),
        fee: feeBreakdown,
        bridgeTxHash: bridgeResult.txHash,
        explorerUrl: bridgeResult.explorerUrl,
        destinationChain: chainInfo.name,
        message: `Session settled! ${feeBreakdown.netAmount} USDC sent to ${chainInfo.name}`,
      }
    } else {
      session.status = 'FAILED'
      session.error = bridgeResult.error
      session.endedAt = Date.now()
      saveSessions(sessions)

      return {
        success: false,
        settledAmount: '0',
        fee: feeBreakdown,
        destinationChain: chainInfo.name,
        message: `Bridge failed: ${bridgeResult.error}`,
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    session.status = 'FAILED'
    session.error = errorMsg
    session.endedAt = Date.now()
    saveSessions(sessions)

    return {
      success: false,
      settledAmount: '0',
      fee: feeBreakdown,
      destinationChain: chainInfo.name,
      message: `Settlement failed: ${errorMsg}`,
    }
  }
}

/**
 * Convert session to PIN wallet (user doesn't have a wallet yet).
 *
 * Just creates a local PIN wallet record — no bridge needed.
 * User can claim later with PIN + wallet address.
 */
export async function sessionToPin(sessionId: string): Promise<SessionPinResult> {
  const sessions = loadSessions()
  const session = sessions.find((s) => s.id === sessionId && s.status === 'ACTIVE')
  if (!session) throw new Error(`Session ${sessionId} not found or not active`)

  const amount = parseFloat(session.currentBalance)
  if (amount <= 0) throw new Error('No balance to convert to PIN')

  logger.info('Converting session to PIN wallet', { sessionId, amount: session.currentBalance })

  const pinWallet = createPinWallet(session.currentBalance)

  session.status = 'SETTLED'
  session.endedAt = Date.now()
  saveSessions(sessions)

  return {
    success: true,
    pin: pinWallet.pin,
    walletId: pinWallet.id,
    amount: session.currentBalance,
    message: `Session converted to PIN wallet. PIN: ${pinWallet.pin}`,
  }
}

export function getSessionSummary(): {
  active: number
  settling: number
  settled: number
  failed: number
  totalValue: string
} {
  const sessions = loadSessions()
  const counts = { active: 0, settling: 0, settled: 0, failed: 0 }
  let totalActiveValue = 0

  for (const s of sessions) {
    switch (s.status) {
      case 'ACTIVE':
        counts.active++
        totalActiveValue += parseFloat(s.currentBalance)
        break
      case 'SETTLING':
        counts.settling++
        break
      case 'SETTLED':
        counts.settled++
        break
      case 'FAILED':
        counts.failed++
        break
    }
  }

  return { ...counts, totalValue: totalActiveValue.toFixed(2) }
}
