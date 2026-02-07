import { logger } from './logger'
import * as crypto from 'crypto'
import * as fs from 'fs'

const CARD_FILE = './festival-cards.json'

export interface FestivalCard {
  walletId: string
  pinHash: string
  balance: string
  totalLoaded: string
  totalSpent: string
  createdAt: number
  lastActivityAt: number
  status: 'ACTIVE' | 'FROZEN'
}

export interface TopUpResult {
  success: boolean
  newBalance: string
  totalLoaded: string
  message: string
}

export interface DeductResult {
  success: boolean
  newBalance: string
  totalSpent: string
  message: string
}

// In-memory cache + file persistence
let _cards: Map<string, FestivalCard> | null = null

function loadCards(): Map<string, FestivalCard> {
  if (_cards) return _cards
  _cards = new Map()
  try {
    if (fs.existsSync(CARD_FILE)) {
      const data: FestivalCard[] = JSON.parse(fs.readFileSync(CARD_FILE, 'utf-8'))
      for (const card of data) {
        _cards.set(card.walletId, card)
      }
    }
  } catch {}
  return _cards
}

function saveCards(): void {
  if (!_cards) return
  try {
    const arr = Array.from(_cards.values())
    fs.writeFileSync(CARD_FILE, JSON.stringify(arr, null, 2))
  } catch {}
}

function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex')
}

const WALLET_ID_CHARS = '0123456789ABCD'
const WALLET_ID_LENGTH = 6

function generateWalletId(): string {
  const cards = loadCards()
  let result: string
  do {
    result = ''
    for (let i = 0; i < WALLET_ID_LENGTH; i++) {
      result += WALLET_ID_CHARS[crypto.randomInt(WALLET_ID_CHARS.length)]
    }
  } while (cards.has(result))
  return result
}

export function createCard(specificId?: string): { walletId: string } {
  const walletId = specificId || generateWalletId()
  const cards = loadCards()
  if (cards.has(walletId)) {
    return { walletId } // Already exists, return it
  }
  const card: FestivalCard = {
    walletId,
    pinHash: '',
    balance: '0',
    totalLoaded: '0',
    totalSpent: '0',
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    status: 'ACTIVE',
  }
  cards.set(walletId, card)
  saveCards()
  logger.info('Festival card created', { walletId })
  return { walletId }
}

export function setPin(walletId: string, pin: string): { success: boolean; message: string } {
  const cards = loadCards()
  const card = cards.get(walletId)
  if (!card) return { success: false, message: 'Card not found' }
  card.pinHash = hashPin(pin)
  card.lastActivityAt = Date.now()
  saveCards()
  logger.info('Festival card PIN set', { walletId })
  return { success: true, message: 'PIN set' }
}

export function getCard(walletId: string): FestivalCard | null {
  const cards = loadCards()
  return cards.get(walletId) || null
}

export function verifyPin(walletId: string, pin: string): boolean {
  const card = getCard(walletId)
  if (!card || !card.pinHash) return false
  return card.pinHash === hashPin(pin)
}

export function topUp(walletId: string, amountUsdc: string): TopUpResult {
  const cards = loadCards()
  const card = cards.get(walletId)
  if (!card) return { success: false, newBalance: '0', totalLoaded: '0', message: 'Card not found' }
  if (card.status !== 'ACTIVE') return { success: false, newBalance: card.balance, totalLoaded: card.totalLoaded, message: 'Card is frozen' }

  const currentBalance = parseFloat(card.balance)
  const addAmount = parseFloat(amountUsdc)
  const newBalance = (currentBalance + addAmount).toFixed(6)
  const newTotalLoaded = (parseFloat(card.totalLoaded) + addAmount).toFixed(6)

  card.balance = newBalance
  card.totalLoaded = newTotalLoaded
  card.lastActivityAt = Date.now()
  saveCards()

  logger.info('Festival card topped up', { walletId, amount: amountUsdc, newBalance })
  return { success: true, newBalance, totalLoaded: newTotalLoaded, message: `Added ${amountUsdc} USDC` }
}

export function deduct(walletId: string, amountUsdc: string): DeductResult {
  const cards = loadCards()
  const card = cards.get(walletId)
  if (!card) return { success: false, newBalance: '0', totalSpent: '0', message: 'Card not found' }
  if (card.status !== 'ACTIVE') return { success: false, newBalance: card.balance, totalSpent: card.totalSpent, message: 'Card is frozen' }

  const currentBalance = parseFloat(card.balance)
  const deductAmount = parseFloat(amountUsdc)

  if (deductAmount > currentBalance) {
    return { success: false, newBalance: card.balance, totalSpent: card.totalSpent, message: 'Insufficient balance' }
  }

  const newBalance = (currentBalance - deductAmount).toFixed(6)
  const newTotalSpent = (parseFloat(card.totalSpent) + deductAmount).toFixed(6)

  card.balance = newBalance
  card.totalSpent = newTotalSpent
  card.lastActivityAt = Date.now()
  saveCards()

  logger.info('Festival card deducted', { walletId, amount: amountUsdc, newBalance })
  return { success: true, newBalance, totalSpent: newTotalSpent, message: `Deducted ${amountUsdc} USDC` }
}

export function getBalance(walletId: string): { balance: string; exists: boolean } {
  const card = getCard(walletId)
  if (!card) return { balance: '0', exists: false }
  return { balance: card.balance, exists: true }
}

export function getSummary(): {
  totalCards: number
  totalBalance: string
  totalLoaded: string
  totalSpent: string
} {
  const cards = loadCards()
  let totalBalance = 0
  let totalLoaded = 0
  let totalSpent = 0

  for (const card of cards.values()) {
    totalBalance += parseFloat(card.balance)
    totalLoaded += parseFloat(card.totalLoaded)
    totalSpent += parseFloat(card.totalSpent)
  }

  return {
    totalCards: cards.size,
    totalBalance: totalBalance.toFixed(6),
    totalLoaded: totalLoaded.toFixed(6),
    totalSpent: totalSpent.toFixed(6),
  }
}
