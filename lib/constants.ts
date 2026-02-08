// ============================================================================
// Coin denominations from Coinslot (Arduino pulse-to-peso mapping)
// ============================================================================
export const COIN_DENOMINATIONS = [
  { pulseMin: 1,  pulseMax: 2,  pesos: 1, usdc: 0.01, label: '1 Peso' },
  { pulseMin: 5,  pulseMax: 10, pesos: 2, usdc: 0.02, label: '2 Pesos' },
  { pulseMin: 11, pulseMax: 16, pesos: 5, usdc: 0.05, label: '5 Pesos' },
] as const

// 1 peso = $0.01 USDC
export const PESO_TO_USDC_RATE = 0.01

// Online demo mode cap (testnet funds are limited)
export const ONLINE_MAX_USDC = 0.10

// ============================================================================
// Supported chains (from kiosk/src/arc/chains.ts)
// ============================================================================
export const SUPPORTED_CHAINS = {
  base:      { name: 'Base Sepolia',      chainId: 84532,    key: 'base' },
  ethereum:  { name: 'Ethereum Sepolia',  chainId: 11155111, key: 'ethereum' },
  arbitrum:  { name: 'Arbitrum Sepolia',  chainId: 421614,   key: 'arbitrum' },
  polygon:   { name: 'Polygon Amoy',      chainId: 80002,    key: 'polygon' },
  optimism:  { name: 'Optimism Sepolia',  chainId: 11155420, key: 'optimism' },
  avalanche: { name: 'Avalanche Fuji',    chainId: 43113,    key: 'avalanche' },
  linea:     { name: 'Linea Sepolia',     chainId: 59141,    key: 'linea' },
} as const

export type ChainKey = keyof typeof SUPPORTED_CHAINS
export const CHAIN_OPTIONS = Object.keys(SUPPORTED_CHAINS) as ChainKey[]
export const DEFAULT_CHAIN: ChainKey = 'base'

// ============================================================================
// Fee rate (from kiosk/src/arc/fees.ts) — 0.001%
// ============================================================================
export const FEE_RATE = 0.00001

export function calculateFee(amount: number) {
  const fee = amount * FEE_RATE
  return {
    grossAmount: amount,
    fee: parseFloat(fee.toFixed(6)),
    netAmount: parseFloat((amount - fee).toFixed(6)),
    feePercentage: '0.001%',
  }
}

// ============================================================================
// Supported crypto assets (extensible, USDC only for now)
// ============================================================================
export const SUPPORTED_ASSETS = [
  { id: 'usdc', name: 'USDC', description: 'USD Coin — Stablecoin pegged to $1.00' },
] as const

// ============================================================================
// Wallet ID charset (0-9 + A-D for 4x4 physical keypad compatibility)
// ============================================================================
export const WALLET_ID_CHARS = '0123456789ABCD'
export const WALLET_ID_LENGTH = 6

// ============================================================================
// Legacy constants (kept for festival mode)
// ============================================================================
export const PRESET_AMOUNTS = [5, 10, 25, 50, 100]
export const DEMO_PIN = '1234'

export const VENDORS = [
  { id: '1', name: 'tacos.eth', category: 'Food' },
  { id: '2', name: 'drinks.eth', category: 'Beverages' },
  { id: '3', name: 'merch.eth', category: 'Merchandise' },
  { id: '4', name: 'games.eth', category: 'Entertainment' },
  { id: '5', name: 'snacks.eth', category: 'Food' },
]

export const DEMO_ENS_NAMES = [
  'player1.ki0xk.eth',
  'arcade.ki0xk.eth',
  'gamer.ki0xk.eth',
  'user42.ki0xk.eth',
  'visitor.ki0xk.eth',
]

export const ADDRESS_PREFIX = '0x'

// ============================================================================
// Gateway chain options (Circle Gateway — testnet)
// ============================================================================
export const GATEWAY_CHAIN_OPTIONS = [
  { key: 'base_sepolia', name: 'Base Sepolia' },
  { key: 'ethereum_sepolia', name: 'Ethereum Sepolia' },
  { key: 'avalanche_fuji', name: 'Avalanche Fuji' },
  { key: 'sonic_testnet', name: 'Sonic Testnet' },
  { key: 'sei_atlantic', name: 'Sei Atlantic' },
  { key: 'hyperevm_testnet', name: 'HyperEVM Testnet' },
] as const

// ============================================================================
// Festival merchant products (preset items per merchant)
// ============================================================================
export interface Product {
  id: string
  name: string
  price: string
}

export const MERCHANT_PRODUCTS: Record<string, Product[]> = {
  beers: [
    { id: 'beer_small', name: 'Small Beer', price: '0.01' },
    { id: 'beer_medium', name: 'Medium Beer', price: '0.02' },
    { id: 'beer_large', name: 'Large Beer', price: '0.05' },
  ],
  food: [
    { id: 'food_snack', name: 'Snack', price: '0.01' },
    { id: 'food_meal', name: 'Meal', price: '0.02' },
    { id: 'food_combo', name: 'Combo', price: '0.05' },
  ],
  merch: [
    { id: 'merch_sticker', name: 'Sticker', price: '0.01' },
    { id: 'merch_tshirt', name: 'T-Shirt', price: '0.02' },
    { id: 'merch_hoodie', name: 'Hoodie', price: '0.05' },
  ],
}
