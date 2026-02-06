import { getClearNode } from './clearnode'
import { bridgeToChain } from './arc/bridge'
import { calculateFee, type FeeBreakdown } from './arc/fees'
import { getChainByKey } from './arc/chains'
import { createPinWallet } from './settlement'
import { logger } from './logger'
import { getServerConfig } from './config'
import { getKioskAddress } from './wallet'
import * as crypto from 'crypto'
import * as fs from 'fs'

const SESSION_FILE = './sessions.json'
const YTEST_USD_TOKEN = '0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb'
const BASE_SEPOLIA_CHAIN_ID = 84532

export interface KioskSession {
  id: string
  channelId?: string
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
  fee?: FeeBreakdown
  error?: string
}

export interface SessionStartResult {
  success: boolean
  sessionId: string
  channelId?: string
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

export async function startSession(userIdentifier?: string): Promise<SessionStartResult> {
  const sessionId = generateSessionId()
  logger.info('Starting new kiosk session', { sessionId, userIdentifier })

  try {
    const clearNode = getClearNode()
    await clearNode.ensureConnected()

    const channelId = await clearNode.createChannel(YTEST_USD_TOKEN, BASE_SEPOLIA_CHAIN_ID)
    logger.info('Yellow channel created', { channelId: channelId?.slice(0, 20) + '...' })

    const session: KioskSession = {
      id: sessionId,
      channelId,
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
      channelId,
      message: `Session ${sessionId} started. Channel: ${channelId}`,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    logger.error('Failed to start session', { sessionId, error: errorMsg })

    const session: KioskSession = {
      id: sessionId,
      userIdentifier,
      totalDeposited: '0',
      currentBalance: '0',
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
      status: 'ACTIVE',
      error: errorMsg,
    }

    const sessions = loadSessions()
    sessions.push(session)
    saveSessions(sessions)

    return {
      success: false,
      sessionId,
      message: `Session started but channel creation failed: ${errorMsg}`,
    }
  }
}

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

  try {
    if (session.channelId) {
      const clearNode = getClearNode()
      await clearNode.ensureConnected()
      const microAmount = BigInt(Math.floor(depositAmount * 1_000_000))
      await clearNode.resizeChannel(session.channelId, microAmount, getKioskAddress())
      logger.info('Channel resized successfully', { sessionId })
    }

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
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    logger.error('Deposit failed', { sessionId, error: errorMsg })

    const currentBalance = parseFloat(session.currentBalance)
    const totalDeposited = parseFloat(session.totalDeposited)
    session.currentBalance = (currentBalance + depositAmount).toFixed(2)
    session.totalDeposited = (totalDeposited + depositAmount).toFixed(2)
    session.lastActivityAt = Date.now()
    session.error = errorMsg
    saveSessions(sessions)

    return {
      success: false,
      newBalance: session.currentBalance,
      totalDeposited: session.totalDeposited,
      message: `Balance updated but channel sync failed: ${errorMsg}`,
    }
  }
}

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

  logger.info('Ending session', {
    sessionId,
    destination: destinationAddress,
    chain: chainInfo.name,
    amount: session.currentBalance,
    fee: feeBreakdown.fee,
  })

  session.status = 'SETTLING'
  session.destinationAddress = destinationAddress
  session.destinationChain = targetChainKey
  session.fee = feeBreakdown
  saveSessions(sessions)

  try {
    if (session.channelId) {
      const clearNode = getClearNode()
      await clearNode.ensureConnected()
      const exists = await clearNode.channelExists(session.channelId)
      if (exists) {
        logger.info('Closing Yellow channel...')
        await clearNode.closeChannel(session.channelId, getKioskAddress())
        logger.info('Channel closed')
      } else {
        logger.info('Channel auto-closed (zero-balance)')
      }
    }

    logger.info('Bridging via Arc...')
    const config = getServerConfig()
    const feeRecipient = config.FEE_RECIPIENT_ADDRESS || undefined
    const bridgeResult = await bridgeToChain(
      destinationAddress,
      targetChainKey,
      session.currentBalance,
      feeRecipient
    )

    if (bridgeResult.success) {
      session.status = 'SETTLED'
      session.bridgeTxHash = bridgeResult.txHash
      session.endedAt = Date.now()
      saveSessions(sessions)

      return {
        success: true,
        settledAmount: feeBreakdown.netAmount.toString(),
        fee: feeBreakdown,
        bridgeTxHash: bridgeResult.txHash,
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

export async function sessionToPin(sessionId: string): Promise<SessionPinResult> {
  const sessions = loadSessions()
  const session = sessions.find((s) => s.id === sessionId && s.status === 'ACTIVE')
  if (!session) throw new Error(`Session ${sessionId} not found or not active`)

  const amount = parseFloat(session.currentBalance)
  if (amount <= 0) throw new Error('No balance to convert to PIN')

  logger.info('Converting session to PIN wallet', { sessionId, amount: session.currentBalance })

  try {
    if (session.channelId) {
      const clearNode = getClearNode()
      await clearNode.ensureConnected()
      const exists = await clearNode.channelExists(session.channelId)
      if (exists) {
        logger.info('Closing Yellow channel...')
        await clearNode.closeChannel(session.channelId, getKioskAddress())
        logger.info('Channel closed')
      }
    }

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
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    logger.error('Failed to convert session to PIN', { sessionId, error: errorMsg })

    try {
      const pinWallet = createPinWallet(session.currentBalance)
      session.status = 'SETTLED'
      session.error = `Channel close failed but PIN created: ${errorMsg}`
      session.endedAt = Date.now()
      saveSessions(sessions)

      return {
        success: true,
        pin: pinWallet.pin,
        walletId: pinWallet.id,
        amount: session.currentBalance,
        message: `PIN created (channel close had issues): ${pinWallet.pin}`,
      }
    } catch {
      session.status = 'FAILED'
      session.error = errorMsg
      session.endedAt = Date.now()
      saveSessions(sessions)

      return {
        success: false,
        pin: '',
        walletId: '',
        amount: session.currentBalance,
        message: `Failed to create PIN: ${errorMsg}`,
      }
    }
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
