async function post<T>(url: string, body?: object): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(data.message || data.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

// Drop-in replacement for mockStartSession
export async function apiStartSession(userIdentifier?: string): Promise<{
  success: boolean
  sessionId: string
  channelId?: string
  message: string
}> {
  return post('/api/session/start', { userIdentifier })
}

// Drop-in replacement for mockDepositToSession
export async function apiDepositToSession(
  sessionId: string,
  amount: string
): Promise<{
  success: boolean
  newBalance: string
  totalDeposited: string
  message: string
}> {
  return post('/api/session/deposit', { sessionId, amount })
}

// Drop-in replacement for mockEndSession
// NOTE: backend reads amount from session, so no amount param needed
export async function apiEndSession(
  sessionId: string,
  destinationAddress: string,
  targetChainKey: string
): Promise<{
  success: boolean
  settledAmount: string
  fee: { grossAmount: number; fee: number; netAmount: number; feePercentage: string }
  bridgeTxHash?: string
  explorerUrl?: string
  destinationChain: string
  message: string
}> {
  return post('/api/session/end', { sessionId, destinationAddress, targetChainKey })
}

// Drop-in replacement for mockSessionToPin
// NOTE: backend reads amount from session, so no amount param needed
export async function apiSessionToPin(sessionId: string): Promise<{
  success: boolean
  pin: string
  walletId: string
  amount: string
  message: string
}> {
  return post('/api/session/pin', { sessionId })
}

// Drop-in replacement for mockLookupPinWallet
export async function apiLookupPinWallet(
  walletId: string,
  pin: string
): Promise<{
  success: boolean
  amount: string
  message: string
}> {
  return post('/api/pin/lookup', { walletId, pin })
}

// Drop-in replacement for mockClaimPinWallet
export async function apiClaimPinWallet(
  walletId: string,
  pin: string,
  destination: string,
  targetChainKey: string
): Promise<{
  success: boolean
  amount: string
  bridgeResult?: { success: boolean; txHash?: string; txStatus?: string; explorerUrl?: string }
  message: string
}> {
  return post('/api/pin/claim', { walletId, pin, destination, targetChainKey })
}

export async function apiClaimNfcCard(
  walletId: string,
  pin: string,
  destination: string,
  targetChainKey: string
): Promise<{
  success: boolean
  amount: string
  bridgeResult?: { success: boolean; txHash?: string; txStatus?: string; explorerUrl?: string }
  message: string
}> {
  return post('/api/festival/claim', { walletId, pin, destination, targetChainKey })
}

// Faucet / balance helpers
export async function apiGetBalances(): Promise<{
  arc: { usdc: string; usdcRaw: string }
  yellow: { asset: string; amount: string; raw: string }
  wallet: string
  timestamp: number
}> {
  const res = await fetch('/api/faucet')
  if (!res.ok) throw new Error('Failed to fetch balances')
  return res.json()
}

export async function apiClaimFaucet(): Promise<{
  claims: {
    yellow: { success: boolean; message: string }
    circle: { success: boolean; message: string }
  }
  balances: {
    arc: { usdc: string; usdcRaw: string }
    yellow: { asset: string; amount: string; raw: string }
    wallet: string
    timestamp: number
  }
}> {
  return post('/api/faucet', {})
}

// ============================================================================
// Festival API
// ============================================================================

export async function apiVerifyAdminPin(pin: string): Promise<{
  success: boolean
  message: string
}> {
  return post('/api/festival/admin/verify-pin', { pin })
}

export async function apiCreateCard(): Promise<{
  success: boolean
  walletId: string
}> {
  return post('/api/festival/card', { action: 'create' })
}

export async function apiCreateCardWithId(walletId: string): Promise<{
  success: boolean
  walletId: string
}> {
  return post('/api/festival/card', { action: 'create', walletId })
}

export async function apiSetCardPin(walletId: string, pin: string): Promise<{
  success: boolean
  message: string
}> {
  return post('/api/festival/card', { action: 'set-pin', walletId, pin })
}

export async function apiVerifyCardPin(walletId: string, pin: string): Promise<{
  success: boolean
  balance: string
  totalLoaded: string
  totalSpent: string
  message?: string
}> {
  return post('/api/festival/card', { action: 'verify-pin', walletId, pin })
}

export async function apiGetCardBalance(walletId: string): Promise<{
  success: boolean
  balance: string
  exists: boolean
}> {
  return post('/api/festival/card', { action: 'balance', walletId })
}

export async function apiGetCardInfo(walletId: string): Promise<{
  success: boolean
  walletId: string
  balance: string
  totalLoaded: string
  totalSpent: string
  status: string
  hasPin: boolean
}> {
  return post('/api/festival/card', { action: 'info', walletId })
}

export async function apiTopUpCard(walletId: string, amount: string): Promise<{
  success: boolean
  newBalance: string
  totalLoaded: string
  message: string
}> {
  return post('/api/festival/card', { action: 'topup', walletId, amount })
}

export async function apiGetCardSummary(): Promise<{
  success: boolean
  totalCards: number
  totalBalance: string
  totalLoaded: string
  totalSpent: string
}> {
  return post('/api/festival/card', { action: 'summary' })
}

export async function apiGetMerchants(): Promise<{
  success: boolean
  merchants: { id: string; name: string; walletAddress: string; preferredChain: string }[]
}> {
  const res = await fetch('/api/festival/merchants')
  if (!res.ok) throw new Error('Failed to fetch merchants')
  return res.json()
}

export async function apiFestivalPay(
  walletId: string,
  pin: string,
  merchantId: string,
  amount: string
): Promise<{
  success: boolean
  txHash?: string
  explorerUrl?: string
  newBalance?: string
  error?: string
}> {
  return post('/api/festival/pay', { walletId, pin, merchantId, amount })
}

export async function apiGetGatewayBalance(): Promise<{
  success: boolean
  available: string
  token: string
}> {
  const res = await fetch('/api/festival/gateway/balance')
  if (!res.ok) throw new Error('Failed to fetch gateway balance')
  return res.json()
}

export async function apiDepositToGateway(amount: string): Promise<{
  success: boolean
  approveTxHash?: string
  depositTxHash?: string
  error?: string
}> {
  return post('/api/festival/gateway/deposit', { amount })
}

export async function apiWriteNfc(walletId: string): Promise<{
  success: boolean
  message: string
}> {
  return post('/api/hardware/nfc/write', { walletId })
}
