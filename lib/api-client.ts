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

export async function apiStartSession(userIdentifier?: string): Promise<{
  success: boolean
  sessionId: string
  message: string
}> {
  return post('/api/session/start', { userIdentifier })
}

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

export async function apiEndSession(
  sessionId: string,
  destinationAddress: string,
  targetChainKey: string
): Promise<{
  success: boolean
  settledAmount: string
  fee: { grossAmount: number; fee: number; netAmount: number; feePercentage: string }
  destinationChain: string
  message: string
}> {
  return post('/api/session/end', { sessionId, destinationAddress, targetChainKey })
}

export async function apiSessionToPin(sessionId: string): Promise<{
  success: boolean
  pin: string
  walletId: string
  amount: string
  message: string
}> {
  return post('/api/session/pin', { sessionId })
}

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

export async function apiClaimPinWallet(
  walletId: string,
  pin: string,
  destination: string,
  targetChainKey: string
): Promise<{
  success: boolean
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
  message: string
}> {
  return post('/api/festival/claim', { walletId, pin, destination, targetChainKey })
}

// Faucet / balance helpers
export async function apiGetBalances(): Promise<{
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
  }
  balances: {
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
  newBalance?: string
  error?: string
}> {
  return post('/api/festival/pay', { walletId, pin, merchantId, amount })
}

export async function apiWriteNfc(walletId: string): Promise<{
  success: boolean
  message: string
}> {
  return post('/api/hardware/nfc/write', { walletId })
}
