import { DEMO_ENS_NAMES, ADDRESS_PREFIX, VENDORS, WALLET_ID_CHARS, WALLET_ID_LENGTH, FEE_RATE } from './constants'

// ============================================================================
// Helpers
// ============================================================================
function randomHex(length: number): string {
  const chars = '0123456789abcdef'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function generateWalletId(): string {
  let result = ''
  for (let i = 0; i < WALLET_ID_LENGTH; i++) {
    result += WALLET_ID_CHARS[Math.floor(Math.random() * WALLET_ID_CHARS.length)]
  }
  return result
}

// ============================================================================
// Session API mocks (match kiosk/src/session.ts return shapes)
// ============================================================================

// Match SessionStartResult
export async function mockStartSession(userIdentifier?: string): Promise<{
  success: boolean
  sessionId: string
  channelId?: string
  message: string
}> {
  await delay(800)
  return {
    success: true,
    sessionId: 'S' + randomHex(4).toUpperCase(),
    channelId: '0x' + randomHex(32),
    message: userIdentifier ? `Session started for ${userIdentifier}` : 'Session started',
  }
}

// Match SessionDepositResult
export async function mockDepositToSession(sessionId: string, amount: string): Promise<{
  success: boolean
  newBalance: string
  totalDeposited: string
  message: string
}> {
  await delay(300)
  return {
    success: true,
    newBalance: amount,
    totalDeposited: amount,
    message: `Deposited ${amount} USDC to ${sessionId}`,
  }
}

// Match SessionEndResult
export async function mockEndSession(
  sessionId: string,
  destinationAddress: string,
  targetChainKey: string,
  amount: number
): Promise<{
  success: boolean
  settledAmount: string
  fee: { grossAmount: number; fee: number; netAmount: number; feePercentage: string }
  bridgeTxHash?: string
  destinationChain: string
  message: string
}> {
  await delay(2500)
  const fee = amount * FEE_RATE
  return {
    success: true,
    settledAmount: (amount - fee).toFixed(6),
    fee: {
      grossAmount: amount,
      fee: parseFloat(fee.toFixed(6)),
      netAmount: parseFloat((amount - fee).toFixed(6)),
      feePercentage: '0.001%',
    },
    bridgeTxHash: '0x' + randomHex(32),
    destinationChain: targetChainKey,
    message: `Settled ${(amount - fee).toFixed(6)} USDC to ${targetChainKey}`,
  }
}

// Match SessionPinResult
export async function mockSessionToPin(sessionId: string, amount: string): Promise<{
  success: boolean
  pin: string
  walletId: string
  amount: string
  message: string
}> {
  await delay(1200)
  const pin = Math.floor(100000 + Math.random() * 900000).toString()
  const walletId = generateWalletId()
  return {
    success: true,
    pin,
    walletId,
    amount,
    message: `PIN wallet created: ${walletId}`,
  }
}

// Match claimPinWallet from kiosk/src/settlement.ts
export async function mockClaimPinWallet(
  walletId: string,
  pin: string,
  destination: string,
  targetChainKey: string
): Promise<{
  success: boolean
  amount: string
  bridgeResult?: { success: boolean; txHash?: string; txStatus?: string }
  message: string
}> {
  await delay(2000)
  // Simulate: any 6-digit PIN is valid in mock mode
  if (pin.length !== 6) {
    return { success: false, amount: '0', message: 'Invalid PIN format' }
  }
  return {
    success: true,
    amount: '0.15', // Mock amount
    bridgeResult: {
      success: true,
      txHash: '0x' + randomHex(32),
      txStatus: 'success',
    },
    message: `Claimed ${walletId} → ${targetChainKey}`,
  }
}

// Look up a PIN wallet (mock — returns balance for display)
export async function mockLookupPinWallet(walletId: string, pin: string): Promise<{
  success: boolean
  amount: string
  message: string
}> {
  await delay(800)
  if (pin.length !== 6) {
    return { success: false, amount: '0', message: 'Invalid PIN' }
  }
  return {
    success: true,
    amount: '0.15',
    message: `Wallet ${walletId} found`,
  }
}

// ============================================================================
// Coin simulation (matches Coinslot Arduino JSON output)
// ============================================================================
export function simulateCoinInsert(denominationIndex: 0 | 1 | 2): {
  type: 'coin'
  pulses: number
  value: number
  ok: boolean
} {
  const denominations = [
    { pulseRange: [1, 2], value: 1 },
    { pulseRange: [5, 10], value: 2 },
    { pulseRange: [11, 16], value: 5 },
  ]
  const d = denominations[denominationIndex]
  const pulses = d.pulseRange[0] + Math.floor(Math.random() * (d.pulseRange[1] - d.pulseRange[0] + 1))
  return { type: 'coin', pulses, value: d.value, ok: true }
}

// ============================================================================
// Legacy mocks (kept for festival mode)
// ============================================================================

export async function mockCreateWallet(): Promise<{
  ensName: string
  address: string
}> {
  await delay(1500)
  const ensName = DEMO_ENS_NAMES[Math.floor(Math.random() * DEMO_ENS_NAMES.length)]
  const address = ADDRESS_PREFIX + randomHex(40)
  return { ensName, address }
}

export async function mockScanNFC(): Promise<{
  cardId: string
  success: boolean
}> {
  await delay(2000)
  const cardId = 'NFC-' + randomHex(8).toUpperCase()
  return { cardId, success: true }
}

export async function mockPayment(amount: number): Promise<{
  success: boolean
  transactionId: string
  vendor: typeof VENDORS[number]
  remainingBalance: number
  currentBalance: number
}> {
  await delay(1500)
  const vendor = VENDORS[Math.floor(Math.random() * VENDORS.length)]
  const transactionId = 'TX-' + randomHex(12).toUpperCase()
  return {
    success: true,
    transactionId,
    vendor,
    remainingBalance: 0,
    currentBalance: 0,
  }
}

export async function mockTopUp(amount: number): Promise<{
  success: boolean
  transactionId: string
  newBalance: number
}> {
  await delay(1800)
  const transactionId = 'TOPUP-' + randomHex(8).toUpperCase()
  return {
    success: true,
    transactionId,
    newBalance: amount,
  }
}

export async function mockUpdateCard(cardId: string, amount: number): Promise<{
  success: boolean
  newBalance: number
}> {
  await delay(1200)
  return {
    success: true,
    newBalance: amount,
  }
}
