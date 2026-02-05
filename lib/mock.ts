import { DEMO_ENS_NAMES, ADDRESS_PREFIX, VENDORS } from './constants'

// Generate random hex string
function randomHex(length: number): string {
  const chars = '0123456789abcdef'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

// Simulate delay
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Mock wallet creation
export async function mockCreateWallet(): Promise<{
  ensName: string
  address: string
}> {
  await delay(1500) // Simulate network delay
  
  const ensName = DEMO_ENS_NAMES[Math.floor(Math.random() * DEMO_ENS_NAMES.length)]
  const address = ADDRESS_PREFIX + randomHex(40)
  
  return { ensName, address }
}

// Mock NFC scan
export async function mockScanNFC(): Promise<{
  cardId: string
  success: boolean
}> {
  await delay(2000) // Simulate NFC scan time
  
  const cardId = 'NFC-' + randomHex(8).toUpperCase()
  
  return { cardId, success: true }
}

// Mock payment
export async function mockPayment(amount: number): Promise<{
  success: boolean
  transactionId: string
  vendor: typeof VENDORS[number]
  remainingBalance: number
  currentBalance: number
}> {
  await delay(1500) // Simulate transaction time
  
  const vendor = VENDORS[Math.floor(Math.random() * VENDORS.length)]
  const transactionId = 'TX-' + randomHex(12).toUpperCase()
  
  // This will be updated with actual balance from state
  return {
    success: true,
    transactionId,
    vendor,
    remainingBalance: 0, // Will be calculated in component
    currentBalance: 0,
  }
}

// Mock top-up
export async function mockTopUp(amount: number): Promise<{
  success: boolean
  transactionId: string
  newBalance: number
}> {
  await delay(1800) // Simulate transaction time
  
  const transactionId = 'TOPUP-' + randomHex(8).toUpperCase()
  
  return {
    success: true,
    transactionId,
    newBalance: amount, // Will be added to current balance in component
  }
}

// Mock admin card update
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
