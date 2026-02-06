async function post<T>(url: string, body?: object): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(data.message || `Request failed: ${res.status}`)
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
